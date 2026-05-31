import { hasDistinctBass } from "../chord-classifier/index.js";
import { formatChordName } from "../formatChordDisplay.js";
import { simplifySuffix } from "../chord-classifier/fuzzySuffixMap.js";
import { noteNameToPitchClass } from "../chord-classifier/notes.js";
import {
	applyProgressionMatchFilters,
	findSubProgressionMatchesPrecomputed,
	MIN_OCCURRENCES_AT_LEAST_TWICE,
	MIN_OCCURRENCES_DEFAULT,
	toPrecomputedAbstractProgression,
	type ProgressionMatchFilterOptions
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
	const bassPitchClass = bassNoteName
		? noteNameToPitchClass(bassNoteName)
		: undefined;
	const chord: StructuredChord = hasDistinctBass({
		rootPitchClass,
		bassPitchClass
	})
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
	{
		fuzzySearch = false,
		matchAtBeginningOnly = false,
		matchAtLeastTwice = false
	}: {
		fuzzySearch?: boolean;
		matchAtBeginningOnly?: boolean;
		matchAtLeastTwice?: boolean;
	} = {}
): SongSearchResult => {
	const songAbstract = fuzzySearch
		? withSimplifiedAbstractSuffixes(preparedSong.abstractProgression)
		: preparedSong.abstractProgression;
	const effectiveSearchProgression = fuzzySearch
		? withSimplifiedSuffixes(searchProgression)
		: searchProgression;
	const matchFilters: ProgressionMatchFilterOptions = {
		matchAtBeginningOnly,
		minOccurrences: matchAtLeastTwice
			? MIN_OCCURRENCES_AT_LEAST_TWICE
			: MIN_OCCURRENCES_DEFAULT
	};
	const matches = applyProgressionMatchFilters(
		findSubProgressionMatchesPrecomputed(
			songAbstract,
			effectiveSearchProgression
		),
		matchFilters
	);

	return { song: preparedSong, matches };
};

const isMatched = ({ matches }: SongSearchResult): boolean =>
	matches.length > 0;

export const createProgressionSearch = ({
	songs,
	limit = Infinity
}: {
	songs: SongInput[];
	limit?: number;
}) => {
	const preparedSongs = songs.map((song, index) => prepareSong(song, index));

	let searchProgression: ParsedProgressionChord[] = [];

	const matchesTitle = (song: PreparedSong, filter: string): boolean =>
		song.title.toLowerCase().includes(filter.toLowerCase());

	const matchesSelectedArtist = (song: PreparedSong, artist: string): boolean =>
		song.artists.includes(artist);

	const getResults = ({
		ignoreSlashBass = false,
		fuzzySearch = false,
		matchAtBeginningOnly = false,
		matchAtLeastTwice = false,
		titleFilter = "",
		selectedArtist = "",
		resultLimit = limit
	}: {
		ignoreSlashBass?: boolean;
		fuzzySearch?: boolean;
		matchAtBeginningOnly?: boolean;
		matchAtLeastTwice?: boolean;
		titleFilter?: string;
		selectedArtist?: string;
		resultLimit?: number;
	} = {}): SongSearchResult[] => {
		const hasChords = searchProgression.length > 0;

		const effectiveProgression = ignoreSlashBass
			? searchProgression.map(
					({ bassPitchClass: _bass, ...chord }) =>
						chord as ParsedProgressionChord
				)
			: searchProgression;

		const results: SongSearchResult[] = [];
		for (const song of preparedSongs) {
			if (selectedArtist && !matchesSelectedArtist(song, selectedArtist))
				continue;
			if (titleFilter && !matchesTitle(song, titleFilter)) continue;
			if (hasChords) {
				const result = buildSongResult(song, effectiveProgression, {
					fuzzySearch,
					matchAtBeginningOnly,
					matchAtLeastTwice
				});
				if (isMatched(result)) {
					results.push(result);
					if (results.length >= resultLimit) break;
				}
			} else {
				results.push({ song, matches: [] });
				if (results.length >= resultLimit) break;
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
	findSubProgressionMatchesPrecomputedFromAbstract,
	applyProgressionMatchFilters,
	progressionContainsSubProgression,
	isPositionInMatch,
	MIN_OCCURRENCES_DEFAULT,
	MIN_OCCURRENCES_AT_LEAST_TWICE,
	type ProgressionMatchFilterOptions
} from "./match.js";
