import { createProgressionSearch } from "../chord-processing/index.js";
import type {
	ParsedProgressionChord,
	SongInput,
	SongSearchResult
} from "../chord-processing/types.js";
import { buildArtistOptions } from "./buildArtistOptions.js";
import { MAX_SEARCH_RESULTS } from "./constants.js";

let songs = $state<SongInput[]>([]);
let searchChords = $state<ParsedProgressionChord[]>([]);
let searchResults = $state<SongSearchResult[]>([]);
let ignoreSlashBassNotes = $state(false);
let fuzzySearch = $state(false);
let matchAtBeginningOnly = $state(false);
let matchAtLeastTwice = $state(false);
let titleFilter = $state("");
let selectedArtist = $state("");
let searchInputActive = $state(true);

const progressionSearch = $derived(
	createProgressionSearch({ songs, limit: MAX_SEARCH_RESULTS })
);

const artistOptions = $derived.by(() => buildArtistOptions(songs));

const hasSearch = $derived(
	searchChords.length > 0 || titleFilter.length > 0 || selectedArtist.length > 0
);

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
	syncSearch();
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
	setSongs,
	syncSearch,
	clearSearch,
	setSelectedArtist,
	setTitleFilter,
	setIgnoreSlashBassNotes,
	setFuzzySearch,
	setMatchAtBeginningOnly,
	setMatchAtLeastTwice,
	setSearchInputActive,
	getProgressionSearch
};
