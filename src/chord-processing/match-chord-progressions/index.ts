import {
	formatChordName,
	hasDistinctBass
} from "../chord-classifier/index.js";
import { noteNameToPitchClass } from "../chord-classifier/notes.js";
import { findSubProgressionMatches } from "./match.js";
import type {
	ParsedProgressionChord,
	PreparedSong,
	ProgressionChordInput,
	SongInput,
	SongSearchResult,
	StructuredChord
} from "../types.js";

const parseProgressionChord = ({
	noteName,
	suffix,
	bassNoteName
}: ProgressionChordInput): ParsedProgressionChord => {
	const rootPitchClass = noteNameToPitchClass(noteName);
	const bassPitchClass = bassNoteName ? noteNameToPitchClass(bassNoteName) : undefined;
	const chord: StructuredChord = hasDistinctBass({ rootPitchClass, bassPitchClass })
		? { rootPitchClass, suffix, bassPitchClass }
		: { rootPitchClass, suffix };
	return { ...chord, display: formatChordName(chord) };
};

const prepareSong = (song: SongInput): PreparedSong => ({
	...song,
	parsedProgression: song.progression.map(parseProgressionChord)
});

const buildSongResult = (
	preparedSong: PreparedSong,
	searchProgression: ParsedProgressionChord[]
): SongSearchResult => {
	const matches = findSubProgressionMatches(preparedSong.parsedProgression, searchProgression);
	return { song: preparedSong, matches };
};

const isMatched = ({ matches }: SongSearchResult): boolean => matches.length > 0;

export const createProgressionSearch = ({ songs }: { songs: SongInput[] }) => {
	const preparedSongs = songs.map(prepareSong);

	let searchProgression: ParsedProgressionChord[] = [];

	const getResults = (): SongSearchResult[] => {
		const allResults = preparedSongs.map((song) => buildSongResult(song, searchProgression));
		if (searchProgression.length === 0) return allResults;
		return allResults.filter(isMatched);
	};

	const append = (chord: StructuredChord) => {
		searchProgression = [
			...searchProgression,
			{ ...chord, display: formatChordName(chord) }
		];
	};

	const clear = () => {
		searchProgression = [];
	};

	return {
		append,
		clear,
		getSearchProgression: () => searchProgression,
		getResults
	};
};

export {
	toAbstractProgression,
	findSubProgressionMatches,
	progressionContainsSubProgression,
	isPositionInMatch
} from "./match.js";
