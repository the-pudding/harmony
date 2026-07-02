export const DEFINE_CHORD_PROGRESSION_URL_PARAM_SONG = "song";
export const DEFINE_CHORD_PROGRESSION_URL_DEBOUNCE_MS = 200;

export type DefineChordProgressionUrlState = {
	song: string;
};

export const readDefineChordProgressionUrlState = (
	searchParams: URLSearchParams
): DefineChordProgressionUrlState => ({
	song: searchParams.get(DEFINE_CHORD_PROGRESSION_URL_PARAM_SONG) ?? ""
});

export const buildDefineChordProgressionUrlState = (state: {
	selectedSongKey: string;
}): DefineChordProgressionUrlState => ({
	song: state.selectedSongKey
});

export const defineChordProgressionUrlStateToQueryString = (
	state: DefineChordProgressionUrlState
): string => {
	const params = new URLSearchParams();
	if (state.song) {
		params.set(DEFINE_CHORD_PROGRESSION_URL_PARAM_SONG, state.song);
	}
	return params.toString();
};

export const areDefineChordProgressionUrlStatesEqual = (
	first: DefineChordProgressionUrlState,
	second: DefineChordProgressionUrlState
): boolean => first.song === second.song;
