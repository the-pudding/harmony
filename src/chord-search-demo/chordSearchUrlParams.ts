import { romanTokensToParsedProgression } from "../chord-processing/romanNumerals.js";
import type { ParsedProgressionChord } from "../chord-processing/types.js";
import { chordToRomanToken } from "./computeNextChordProbabilities.js";
import { SEQUENCE_CHART_CHORD_SEPARATOR } from "./constants.js";

export const CHORD_SEARCH_URL_PARAM_PROGRESSION = "progression";
export const CHORD_SEARCH_URL_PARAM_ARTIST = "artist";
export const CHORD_SEARCH_URL_PARAM_SONG = "song";

export type ChordSearchUrlState = {
	progression: string;
	artist: string;
	song: string;
};

export const readChordSearchUrlState = (
	searchParams: URLSearchParams
): ChordSearchUrlState => ({
	progression: searchParams.get(CHORD_SEARCH_URL_PARAM_PROGRESSION) ?? "",
	artist: searchParams.get(CHORD_SEARCH_URL_PARAM_ARTIST) ?? "",
	song: searchParams.get(CHORD_SEARCH_URL_PARAM_SONG) ?? ""
});

export const buildChordSearchUrlState = (state: {
	searchChords: ParsedProgressionChord[];
	selectedArtist: string;
	titleFilter: string;
}): ChordSearchUrlState => {
	const tokens = state.searchChords
		.map(chordToRomanToken)
		.filter((token): token is string => token !== null);
	const progression =
		tokens.length === state.searchChords.length && tokens.length > 0
			? tokens.join(SEQUENCE_CHART_CHORD_SEPARATOR)
			: "";

	return {
		progression,
		artist: state.selectedArtist,
		song: state.titleFilter
	};
};

export const chordSearchUrlStateToQueryString = (
	state: ChordSearchUrlState
): string => {
	const params = new URLSearchParams();
	if (state.progression) {
		params.set(CHORD_SEARCH_URL_PARAM_PROGRESSION, state.progression);
	}
	if (state.artist) {
		params.set(CHORD_SEARCH_URL_PARAM_ARTIST, state.artist);
	}
	if (state.song) {
		params.set(CHORD_SEARCH_URL_PARAM_SONG, state.song);
	}
	return params.toString();
};

export const areChordSearchUrlStatesEqual = (
	first: ChordSearchUrlState,
	second: ChordSearchUrlState
): boolean =>
	first.progression === second.progression &&
	first.artist === second.artist &&
	first.song === second.song;

export const isValidProgressionParam = (progression: string): boolean =>
	progression.length > 0 &&
	romanTokensToParsedProgression(
		progression.split(SEQUENCE_CHART_CHORD_SEPARATOR)
	) !== null;
