import debounce from "lodash.debounce";
import { createProgressionSearch } from "../chord-processing/index.js";
import { romanTokensToParsedProgression } from "../chord-processing/romanNumerals.js";
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
	SEQUENCE_CHART_CHORD_SEPARATOR,
	SEQUENCE_CHART_DEBOUNCE_MS,
	SEQUENCE_CHART_TOP_N,
	sequenceChartEffectiveMinLength,
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
import {
	computeSongResults,
	initSongResultsWorkerPool,
	terminateSongResultsWorkerPool
} from "./songResultsWorkerPool.js";
import {
	matchesYearRange,
	toPlainYearRange,
	type YearRangeFilter
} from "./yearRangeFilter.js";

let songs = $state<SongInput[]>([]);
let searchChords = $state<ParsedProgressionChord[]>([]);
let searchResults = $state<GroupedSongSearchResult[]>([]);
let annualMatchCounts = $state<AnnualMatchCount[]>([]);
let bassAsRoot = $state(true);
let ignoreSlashBassNotes = $state(true);
let fuzzySearch = $state(true);
let matchAtBeginningOnly = $state(false);
let matchAtLeastTwice = $state(false);
let aggregateRepeats = $state(true);
let canonicalizeRotations = $state(false);
let minNumChordsToCountAsAProgression = $state(
	MIN_NUM_CHORDS_TO_COUNT_AS_A_PROGRESSION_DEFAULT
);
let titleFilter = $state("");
let debouncedTitleFilter = $state("");
let selectedArtist = $state("");
let yearRangeFilter = $state.raw<YearRangeFilter | null>(null);
let searchInputActive = $state(true);
let sequenceChartData = $state<VariableGramStat[]>([]);
let sequenceChartStatus = $state<"idle" | "loading" | "ready" | "error">(
	"idle"
);
let sequenceChartError = $state("");
let chartWorkerPoolReady = $state(false);
let songResultsWorkerPoolReady = $state(false);
let chartRequestId = 0;

let songResultsComputeChain: Promise<void> = Promise.resolve();
let songResultsComputeVersion = 0;

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
	searchChords.length > 0 ||
		titleFilter.length > 0 ||
		selectedArtist.length > 0 ||
		yearRangeFilter !== null
);

const workerChunkFilters = () => ({
	hasSearchChords: searchChords.length > 0,
	titleFilter: debouncedTitleFilter,
	selectedArtist,
	yearRange: toPlainYearRange(yearRangeFilter),
	fuzzySearch,
	matchAtBeginningOnly,
	matchAtLeastTwice
});

const runSequenceChartCompute = async () => {
	if (!chartWorkerPoolReady) return;

	const requestId = chartRequestId + 1;
	chartRequestId = requestId;
	sequenceChartStatus = "loading";

	try {
		const result = await computeSequenceChartStats({
			requestId,
			filters: workerChunkFilters(),
			searchAbstract: buildSearchAbstract(searchChords, {
				ignoreSlashBassNotes,
				fuzzySearch
			}),
			options: {
				topN: SEQUENCE_CHART_TOP_N,
				minNumChordsToCountAsAProgression: sequenceChartEffectiveMinLength(
					minNumChordsToCountAsAProgression,
					searchChords.length
				),
				maxLen: VARIABLE_GRAM_MAX_LENGTH,
				aggregateRepeats,
				canonicalizeRotations
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

const filterGroupedResultsByYear = (
	groupedResults: GroupedSongSearchResult[]
): GroupedSongSearchResult[] => {
	if (!yearRangeFilter) return groupedResults;

	return groupedResults.filter((result) =>
		matchesYearRange(result.year, yearRangeFilter)
	);
};

const applySongResults = (groupedResults: GroupedSongSearchResult[]) => {
	const filteredResults = filterGroupedResultsByYear(groupedResults);
	searchResults = filteredResults.slice(0, MAX_SEARCH_RESULTS);
	annualMatchCounts = buildAnnualMatchCounts(filteredResults);
};

const runSongResultsCompute = async (version: number) => {
	const output = await computeSongResults(version, {
		filters: workerChunkFilters(),
		searchAbstract: buildSearchAbstract(searchChords, {
			ignoreSlashBassNotes,
			fuzzySearch
		}),
		searchProgression: searchChords,
		ignoreSlashBass: ignoreSlashBassNotes,
		matchOptions: {
			fuzzySearch,
			matchAtBeginningOnly,
			matchAtLeastTwice
		}
	});

	return output;
};

const enqueueSongResultsCompute = () => {
	if (!songResultsWorkerPoolReady) return;

	const version = ++songResultsComputeVersion;

	songResultsComputeChain = songResultsComputeChain.then(async () => {
		try {
			const { groupedResults } = await runSongResultsCompute(version);
			if (version !== songResultsComputeVersion) return;
			applySongResults(groupedResults);
		} catch {
			// Keep prior results on worker failure
		}
	});
};

const scheduleFilteredRecompute = () => {
	if (songResultsWorkerPoolReady) enqueueSongResultsCompute();
	if (chartWorkerPoolReady) void runSequenceChartCompute();
};

$effect.root(() => {
	$effect(() => {
		debouncedTitleFilter;
		selectedArtist;
		yearRangeFilter?.[0];
		yearRangeFilter?.[1];
		fuzzySearch;
		matchAtBeginningOnly;
		matchAtLeastTwice;
		aggregateRepeats;
		canonicalizeRotations;
		minNumChordsToCountAsAProgression;
		ignoreSlashBassNotes;
		searchChords;
		chartWorkerPoolReady;

		if (!chartWorkerPoolReady) return;

		void runSequenceChartCompute();
	});

	$effect(() => {
		debouncedTitleFilter;
		selectedArtist;
		yearRangeFilter?.[0];
		yearRangeFilter?.[1];
		fuzzySearch;
		matchAtBeginningOnly;
		matchAtLeastTwice;
		ignoreSlashBassNotes;
		searchChords;
		songResultsWorkerPoolReady;

		if (!songResultsWorkerPoolReady) return;

		enqueueSongResultsCompute();
	});
});

const syncSearchChords = () => {
	searchChords = progressionSearch.getSearchProgression();
};

const clearSearch = () => {
	progressionSearch.clear();
	syncSearchChords();
};

const setSearchFromSequenceLabel = (label: string) => {
	const tokens = label.split(SEQUENCE_CHART_CHORD_SEPARATOR);
	const progression = romanTokensToParsedProgression(tokens);
	if (!progression) return;

	progressionSearch.setProgression(progression);
	syncSearchChords();
};

const setSongs = async (nextSongs: SongInput[]) => {
	songs = nextSongs;
	searchChords = [];
	searchResults = [];
	annualMatchCounts = [];
	sequenceChartStatus = "loading";
	chartWorkerPoolReady = false;
	songResultsWorkerPoolReady = false;
	songResultsComputeChain = Promise.resolve();
	songResultsComputeVersion = 0;

	try {
		await Promise.all([
			initSequenceChartWorkerPoolFromSongs(nextSongs),
			initSongResultsWorkerPool(nextSongs)
		]);
		chartWorkerPoolReady = true;
		songResultsWorkerPoolReady = true;
	} catch (error) {
		chartWorkerPoolReady = false;
		songResultsWorkerPoolReady = false;
		sequenceChartStatus = "error";
		sequenceChartError = error instanceof Error ? error.message : String(error);
	}
};

const setSelectedArtist = (value: string) => {
	selectedArtist = value;
};

const setYearRangeFilter = (range: YearRangeFilter | null) => {
	yearRangeFilter = toPlainYearRange(range);
	scheduleFilteredRecompute();
};

const clearYearRangeFilter = () => {
	yearRangeFilter = null;
	scheduleFilteredRecompute();
};

const setTitleFilter = (value: string) => {
	titleFilter = value;
	debouncedSetTitleFilter(value);
};

const setBassAsRoot = (checked: boolean) => {
	bassAsRoot = checked;
};

const setIgnoreSlashBassNotes = (checked: boolean) => {
	ignoreSlashBassNotes = checked;
};

const setFuzzySearch = (checked: boolean) => {
	fuzzySearch = checked;
};

const setMatchAtBeginningOnly = (checked: boolean) => {
	matchAtBeginningOnly = checked;
};

const setMatchAtLeastTwice = (checked: boolean) => {
	matchAtLeastTwice = checked;
};

const setAggregateRepeats = (checked: boolean) => {
	aggregateRepeats = checked;
};

const setCanonicalizeRotations = (checked: boolean) => {
	canonicalizeRotations = checked;
};

const setMinNumChordsToCountAsAProgression = (value: number) => {
	minNumChordsToCountAsAProgression =
		clampMinNumChordsToCountAsAProgression(value);
};

const setSearchInputActive = (active: boolean) => {
	searchInputActive = active;
};

const toggleSearchInput = () => {
	searchInputActive = !searchInputActive;
};

const getProgressionSearch = () => progressionSearch;

const disposeWorkers = () => {
	terminateSequenceChartWorkerPool();
	terminateSongResultsWorkerPool();
	chartWorkerPoolReady = false;
	songResultsWorkerPoolReady = false;
	chartRequestId += 1;
	songResultsComputeChain = Promise.resolve();
	songResultsComputeVersion = 0;
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
	get aggregateRepeats() {
		return aggregateRepeats;
	},
	get canonicalizeRotations() {
		return canonicalizeRotations;
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
	get yearRangeFilter() {
		return yearRangeFilter;
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
	syncSearch: syncSearchChords,
	clearSearch,
	setSearchFromSequenceLabel,
	setSelectedArtist,
	setYearRangeFilter,
	clearYearRangeFilter,
	setTitleFilter,
	setBassAsRoot,
	setIgnoreSlashBassNotes,
	setFuzzySearch,
	setMatchAtBeginningOnly,
	setMatchAtLeastTwice,
	setAggregateRepeats,
	setCanonicalizeRotations,
	setMinNumChordsToCountAsAProgression,
	setSearchInputActive,
	toggleSearchInput,
	getProgressionSearch,
	disposeWorkers,
	disposeSequenceChartWorkers: disposeWorkers
};
