import {
	formatChordName,
	hasDistinctBass
} from "../chord-classifier/index.js";
import { noteNameToPitchClass } from "../chord-classifier/notes.js";
import {
	findSubProgressionMatchesPrecomputed,
	toPrecomputedAbstractProgression
} from "./match.js";
import type {
	ParsedProgressionChord,
	PreparedSong,
	PrecomputedAbstractProgression,
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

const buildAbstractProgression = (
	song: SongInput,
	parsedProgression: ParsedProgressionChord[]
) => {
	if (
		song.suffixes &&
		song.deltas &&
		song.bassIntervals &&
		song.wrapDelta !== undefined
	) {
		return {
			suffixes: song.suffixes,
			deltas: song.deltas,
			bassIntervals: song.bassIntervals,
			wrapDelta: song.wrapDelta
		} satisfies PrecomputedAbstractProgression;
	}

	return toPrecomputedAbstractProgression(parsedProgression);
};

const prepareSong = (song: SongInput, index: number): PreparedSong => {
	const parsedProgression = song.progression.map(parseProgressionChord);

	return {
		...song,
		id: song.id ?? `local-${index}`,
		parsedProgression,
		abstractProgression: buildAbstractProgression(song, parsedProgression)
	};
};

const buildSongResult = (
	preparedSong: PreparedSong,
	searchProgression: ParsedProgressionChord[]
): SongSearchResult => {
	const matches = findSubProgressionMatchesPrecomputed(
		preparedSong.abstractProgression,
		searchProgression
	);

	return { song: preparedSong, matches };
};

const isMatched = ({ matches }: SongSearchResult): boolean => matches.length > 0;

export const createProgressionSearch = ({
	songs,
	limit = Infinity
}: {
	songs: SongInput[];
	limit?: number;
}) => {
	const preparedSongs = songs.map((song, index) => prepareSong(song, index));

	let searchProgression: ParsedProgressionChord[] = [];

	const getResults = (): SongSearchResult[] => {
		if (searchProgression.length === 0) return [];

		const results: SongSearchResult[] = [];
		for (const song of preparedSongs) {
			const result = buildSongResult(song, searchProgression);
			if (isMatched(result)) {
				results.push(result);
				if (results.length >= limit) break;
			}
		}
		return results;
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
	toPrecomputedAbstractProgression,
	findSubProgressionMatches,
	findSubProgressionMatchesPrecomputed,
	progressionContainsSubProgression,
	isPositionInMatch
} from "./match.js";
