import {
	formatChordName,
	hasDistinctBass
} from "../chord-classifier/index.js";
import { simplifySuffix } from "../chord-classifier/fuzzySuffixMap.js";
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

const withSimplifiedSuffixes = <T extends { suffix: string }>(
	chords: T[]
): T[] =>
	chords.map((chord) => ({ ...chord, suffix: simplifySuffix(chord.suffix) }));

const withSimplifiedAbstractSuffixes = (
	abstractProgression: PrecomputedAbstractProgression
): PrecomputedAbstractProgression => ({
	...abstractProgression,
	suffixes: abstractProgression.suffixes.map(simplifySuffix)
});

const buildSongResult = (
	preparedSong: PreparedSong,
	searchProgression: ParsedProgressionChord[],
	{ fuzzySearch = false }: { fuzzySearch?: boolean } = {}
): SongSearchResult => {
	const songAbstract = fuzzySearch
		? withSimplifiedAbstractSuffixes(preparedSong.abstractProgression)
		: preparedSong.abstractProgression;
	const effectiveSearchProgression = fuzzySearch
		? withSimplifiedSuffixes(searchProgression)
		: searchProgression;
	const matches = findSubProgressionMatchesPrecomputed(
		songAbstract,
		effectiveSearchProgression
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

	const getResults = ({
		ignoreSlashBass = false,
		fuzzySearch = false
	}: {
		ignoreSlashBass?: boolean;
		fuzzySearch?: boolean;
	} = {}): SongSearchResult[] => {
		if (searchProgression.length === 0) return [];

		const effectiveProgression = ignoreSlashBass
			? searchProgression.map(
					({ bassPitchClass: _bass, ...chord }) =>
						chord as ParsedProgressionChord
				)
			: searchProgression;

		const results: SongSearchResult[] = [];
		for (const song of preparedSongs) {
			const result = buildSongResult(song, effectiveProgression, {
				fuzzySearch
			});
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
