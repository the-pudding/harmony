import debounce from "lodash.debounce";
import { createProgressionSearch } from "../chord-processing/index.js";
import type {
	ParsedProgressionChord,
	SongInput,
	SongSearchResult
} from "../chord-processing/types.js";
import { buildArtistOptions } from "./buildArtistOptions.js";
import {
	MAX_SEARCH_RESULTS,
	SEQUENCE_CHART_DEBOUNCE_MS,
	SEQUENCE_CHART_TOP_N,
	VARIABLE_GRAM_MAX_LENGTH,
	VARIABLE_GRAM_MIN_LENGTH
} from "./constants.js";
import { computeVariableGramStats } from "./computeVariableGramStats.js";
import { resolveChartCorpus } from "./resolveChartCorpus.js";

let songs = $state<SongInput[]>([]);
let searchChords = $state<ParsedProgressionChord[]>([]);
let searchResults = $state<SongSearchResult[]>([]);
let bassAsRoot = $state(true);
let ignoreSlashBassNotes = $state(true);
let fuzzySearch = $state(true);
let matchAtBeginningOnly = $state(true);
let matchAtLeastTwice = $state(true);
let titleFilter = $state("");
let debouncedTitleFilter = $state("");
let selectedArtist = $state("");
let searchInputActive = $state(true);

const debouncedSetTitleFilter = debounce((value: string) => {
	debouncedTitleFilter = value;
}, SEQUENCE_CHART_DEBOUNCE_MS);

const progressionSearch = $derived(
	createProgressionSearch({ songs, limit: MAX_SEARCH_RESULTS })
);

const artistOptions = $derived.by(() => buildArtistOptions(songs));

const hasSearch = $derived(
	searchChords.length > 0 || titleFilter.length > 0 || selectedArtist.length > 0
);

const sequenceChartData = $derived.by(() => {
	const hasSearchChords = searchChords.length > 0;
	const matchingResults = hasSearchChords
		? progressionSearch.getResults({
				ignoreSlashBass: ignoreSlashBassNotes,
				fuzzySearch,
				matchAtBeginningOnly,
				matchAtLeastTwice,
				titleFilter: debouncedTitleFilter,
				selectedArtist,
				resultLimit: Infinity
			})
		: [];

	const corpus = resolveChartCorpus(songs, {
		hasSearchChords,
		titleFilter: debouncedTitleFilter,
		selectedArtist,
		getMatchingSongIds: () =>
			new Set(
				matchingResults
					.map(({ song }) => song.id)
					.filter((id): id is string => id !== undefined)
			)
	});

	return computeVariableGramStats(corpus, {
		topN: SEQUENCE_CHART_TOP_N,
		minLen: VARIABLE_GRAM_MIN_LENGTH,
		maxLen: VARIABLE_GRAM_MAX_LENGTH
	});
});

const syncSearch = () => {
	searchChords = progressionSearch.getSearchProgression();
	searchResults = progressionSearch.getResults({
		ignoreSlashBass: ignoreSlashBassNotes,
		fuzzySearch,
		matchAtBeginningOnly,
		matchAtLeastTwice,
		titleFilter,
		selectedArtist
	});
};

const clearSearch = () => {
	progressionSearch.clear();
	syncSearch();
};

const setSongs = (nextSongs: SongInput[]) => {
	songs = nextSongs;
	syncSearch();
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

const setSearchInputActive = (active: boolean) => {
	searchInputActive = active;
};

const getProgressionSearch = () => progressionSearch;

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
	setSearchInputActive,
	getProgressionSearch
};
