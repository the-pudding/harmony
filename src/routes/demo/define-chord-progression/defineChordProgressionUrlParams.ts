import {
	readSongCorpusFilterUrlState,
	writeSongCorpusFilterUrlState,
	type SongCorpusFilterUrlState
} from "../songCorpusFilterUrlParams.js";

export const DEFINE_CHORD_PROGRESSION_URL_PARAM_SONG = "song";
export const DEFINE_CHORD_PROGRESSION_URL_PARAM_SONGS_CONTEXT = "songsContext";
export const DEFINE_CHORD_PROGRESSION_SONGS_CONTEXT_EXPANDED_VALUE = "1";

export type DefineChordProgressionUrlState = {
	song: string;
	songsContextExpanded: boolean;
};

export const readDefineChordProgressionUrlState = (
	searchParams: URLSearchParams
): DefineChordProgressionUrlState => ({
	song: searchParams.get(DEFINE_CHORD_PROGRESSION_URL_PARAM_SONG) ?? "",
	songsContextExpanded:
		searchParams.get(DEFINE_CHORD_PROGRESSION_URL_PARAM_SONGS_CONTEXT) ===
		DEFINE_CHORD_PROGRESSION_SONGS_CONTEXT_EXPANDED_VALUE
});

export const buildDefineChordProgressionUrlState = (state: {
	selectedSongKey: string;
	songsContextExpanded: boolean;
}): DefineChordProgressionUrlState => ({
	song: state.selectedSongKey,
	songsContextExpanded: state.songsContextExpanded
});

export const defineChordProgressionUrlStateToQueryString = (
	state: DefineChordProgressionUrlState,
	corpusFilters: SongCorpusFilterUrlState
): string => {
	const params = new URLSearchParams();
	if (state.song) {
		params.set(DEFINE_CHORD_PROGRESSION_URL_PARAM_SONG, state.song);
	}
	if (state.songsContextExpanded) {
		params.set(
			DEFINE_CHORD_PROGRESSION_URL_PARAM_SONGS_CONTEXT,
			DEFINE_CHORD_PROGRESSION_SONGS_CONTEXT_EXPANDED_VALUE
		);
	}
	writeSongCorpusFilterUrlState(params, corpusFilters);
	return params.toString();
};

export const defineChordProgressionUrlStateToQueryStringPreservingCorpusFilters =
	(
		state: DefineChordProgressionUrlState,
		currentSearchParams: URLSearchParams
	): string =>
		defineChordProgressionUrlStateToQueryString(
			state,
			readSongCorpusFilterUrlState(currentSearchParams)
		);

export const areDefineChordProgressionUrlStatesEqual = (
	first: DefineChordProgressionUrlState,
	second: DefineChordProgressionUrlState
): boolean =>
	first.song === second.song &&
	first.songsContextExpanded === second.songsContextExpanded;

export const shouldPushSongHistoryChange = (
	currentUrlState: DefineChordProgressionUrlState,
	desiredState: DefineChordProgressionUrlState,
	isSongKeyKnown: (songKey: string) => boolean
): boolean =>
	currentUrlState.song !== desiredState.song &&
	currentUrlState.song !== "" &&
	isSongKeyKnown(currentUrlState.song) &&
	isSongKeyKnown(desiredState.song);
