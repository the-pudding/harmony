import debounce from "lodash.debounce";
import { createProgressionSearch } from "../chord-processing/index.js";
import type {
	GroupedSongSearchResult,
	ParsedProgressionChord,
	SongInput
} from "../chord-processing/types.js";
import { buildSearchAbstract } from "./buildSearchAbstract.js";
import { buildArtistOptions } from "./buildArtistOptions.js";
import {
	MAX_SEARCH_RESULTS,
	MIN_NUM_CHORDS_TO_COUNT_AS_A_PROGRESSION_DEFAULT,
	MIN_NUM_CHORDS_TO_COUNT_AS_A_PROGRESSION_MAX,
	MIN_NUM_CHORDS_TO_COUNT_AS_A_PROGRESSION_MIN,
	SEQUENCE_CHART_DEBOUNCE_MS,
	SEQUENCE_CHART_TOP_N,
	VARIABLE_GRAM_MAX_LENGTH
} from "./constants.js";
import type { VariableGramStat } from "./computeVariableGramStats.js";
import {
	buildAnnualMatchCounts,
	type AnnualMatchCount
} from "./chord-progression-search-results/buildAnnualMatchCounts.js";
import {
	computeSequenceChartStats,
	initSequenceChartWorkerPoolFromSongs,
	terminateSequenceChartWorkerPool
} from "./sequenceChartWorkerPool.js";

let songs = $state<SongInput[]>([]);
let searchChords = $state<ParsedProgressionChord[]>([]);
let searchResults = $state<GroupedSongSearchResult[]>([]);
let annualMatchCounts = $state<AnnualMatchCount[]>([]);
let bassAsRoot = $state(true);
let ignoreSlashBassNotes = $state(true);
let fuzzySearch = $state(true);
let matchAtBeginningOnly = $state(false);
let matchAtLeastTwice = $state(false);
let minNumChordsToCountAsAProgression = $state(
	MIN_NUM_CHORDS_TO_COUNT_AS_A_PROGRESSION_DEFAULT
);
let titleFilter = $state("");
let debouncedTitleFilter = $state("");
let selectedArtist = $state("");
let searchInputActive = $state(true);
let sequenceChartData = $state<VariableGramStat[]>([]);
let sequenceChartStatus = $state<"idle" | "loading" | "ready" | "error">(
	"idle"
);
let sequenceChartError = $state("");
let chartWorkerPoolReady = $state(false);
let chartRequestId = 0;

const debouncedSetTitleFilter = debounce((value: string) => {
	debouncedTitleFilter = value;
}, SEQUENCE_CHART_DEBOUNCE_MS);

const clampMinNumChordsToCountAsAProgression = (value: number) =>
	Math.min(
		MIN_NUM_CHORDS_TO_COUNT_AS_A_PROGRESSION_MAX,
		Math.max(MIN_NUM_CHORDS_TO_COUNT_AS_A_PROGRESSION_MIN, Math.round(value))
	);

const progressionSearch = $derived(
	createProgressionSearch({ songs, limit: MAX_SEARCH_RESULTS })
);

const artistOptions = $derived.by(() => buildArtistOptions(songs));

const hasSearch = $derived(
	searchChords.length > 0 || titleFilter.length > 0 || selectedArtist.length > 0
);

const runSequenceChartCompute = async () => {
	if (!chartWorkerPoolReady) return;

	const requestId = chartRequestId + 1;
	chartRequestId = requestId;
	sequenceChartStatus = "loading";

	try {
		const result = await computeSequenceChartStats({
			requestId,
			filters: {
				hasSearchChords: searchChords.length > 0,
				titleFilter: debouncedTitleFilter,
				selectedArtist,
				fuzzySearch,
				matchAtBeginningOnly,
				matchAtLeastTwice
			},
			searchAbstract: buildSearchAbstract(searchChords, {
				ignoreSlashBassNotes,
				fuzzySearch
			}),
			options: {
				topN: SEQUENCE_CHART_TOP_N,
				minNumChordsToCountAsAProgression,
				maxLen: VARIABLE_GRAM_MAX_LENGTH
			}
		});

		if (requestId !== chartRequestId) return;

		sequenceChartData = result;
		sequenceChartStatus = "ready";
		sequenceChartError = "";
	} catch (error) {
		if (requestId !== chartRequestId) return;

		sequenceChartStatus = "error";
		sequenceChartError = error instanceof Error ? error.message : String(error);
	}
};

$effect.root(() => {
	$effect(() => {
		debouncedTitleFilter;
		selectedArtist;
		fuzzySearch;
		matchAtBeginningOnly;
		matchAtLeastTwice;
		minNumChordsToCountAsAProgression;
		ignoreSlashBassNotes;
		searchChords;
		chartWorkerPoolReady;

		if (!chartWorkerPoolReady) return;

		void runSequenceChartCompute();
	});
});

const syncSearch = () => {
	searchChords = progressionSearch.getSearchProgression();
	const allResults = progressionSearch.getGroupedResults({
		ignoreSlashBass: ignoreSlashBassNotes,
		fuzzySearch,
		matchAtBeginningOnly,
		matchAtLeastTwice,
		titleFilter,
		selectedArtist,
		resultLimit: Infinity
	});
	searchResults = allResults.slice(0, MAX_SEARCH_RESULTS);
	annualMatchCounts = buildAnnualMatchCounts(allResults);
};

const clearSearch = () => {
	progressionSearch.clear();
	syncSearch();
};

const setSongs = async (nextSongs: SongInput[]) => {
	songs = nextSongs;
	syncSearch();
	sequenceChartStatus = "loading";
	chartWorkerPoolReady = false;

	try {
		await initSequenceChartWorkerPoolFromSongs(nextSongs);
		chartWorkerPoolReady = true;
	} catch (error) {
		chartWorkerPoolReady = false;
		sequenceChartStatus = "error";
		sequenceChartError = error instanceof Error ? error.message : String(error);
	}
};

const setSelectedArtist = (value: string) => {
	selectedArtist = value;
	syncSearch();
};

const setTitleFilter = (value: string) => {
	titleFilter = value;
	debouncedSetTitleFilter(value);
	syncSearch();
};

const setBassAsRoot = (checked: boolean) => {
	bassAsRoot = checked;
};

const setIgnoreSlashBassNotes = (checked: boolean) => {
	ignoreSlashBassNotes = checked;
	syncSearch();
};

const setFuzzySearch = (checked: boolean) => {
	fuzzySearch = checked;
	syncSearch();
};

const setMatchAtBeginningOnly = (checked: boolean) => {
	matchAtBeginningOnly = checked;
	syncSearch();
};

const setMatchAtLeastTwice = (checked: boolean) => {
	matchAtLeastTwice = checked;
	syncSearch();
};

const setMinNumChordsToCountAsAProgression = (value: number) => {
	minNumChordsToCountAsAProgression =
		clampMinNumChordsToCountAsAProgression(value);
};

const setSearchInputActive = (active: boolean) => {
	searchInputActive = active;
};

const getProgressionSearch = () => progressionSearch;

const disposeSequenceChartWorkers = () => {
	terminateSequenceChartWorkerPool();
	chartWorkerPoolReady = false;
	chartRequestId += 1;
	sequenceChartStatus = "idle";
};

export const chordSearchDemoStore = {
	get songs() {
		return songs;
	},
	get searchChords() {
		return searchChords;
	},
	get searchResults() {
		return searchResults;
	},
	get annualMatchCounts() {
		return annualMatchCounts;
	},
	get bassAsRoot() {
		return bassAsRoot;
	},
	get ignoreSlashBassNotes() {
		return ignoreSlashBassNotes;
	},
	get fuzzySearch() {
		return fuzzySearch;
	},
	get matchAtBeginningOnly() {
		return matchAtBeginningOnly;
	},
	get matchAtLeastTwice() {
		return matchAtLeastTwice;
	},
	get minNumChordsToCountAsAProgression() {
		return minNumChordsToCountAsAProgression;
	},
	get titleFilter() {
		return titleFilter;
	},
	get selectedArtist() {
		return selectedArtist;
	},
	get searchInputActive() {
		return searchInputActive;
	},
	get artistOptions() {
		return artistOptions;
	},
	get hasSearch() {
		return hasSearch;
	},
	get sequenceChartData() {
		return sequenceChartData;
	},
	get sequenceChartStatus() {
		return sequenceChartStatus;
	},
	get sequenceChartError() {
		return sequenceChartError;
	},
	setSongs,
	syncSearch,
	clearSearch,
	setSelectedArtist,
	setTitleFilter,
	setBassAsRoot,
	setIgnoreSlashBassNotes,
	setFuzzySearch,
	setMatchAtBeginningOnly,
	setMatchAtLeastTwice,
	setMinNumChordsToCountAsAProgression,
	setSearchInputActive,
	getProgressionSearch,
	disposeSequenceChartWorkers
};
