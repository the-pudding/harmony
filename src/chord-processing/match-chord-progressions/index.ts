import { hasDistinctBass } from "../chord-classifier/index.js";
import { formatChordName } from "../formatChordDisplay.js";
import { simplifySuffix } from "../chord-classifier/fuzzySuffixMap.js";
import { noteNameToPitchClass } from "../chord-classifier/notes.js";
import { dedupeAdjacentParsedProgression } from "./dedupe.js";
import {
	applyProgressionMatchFilters,
	findSubProgressionMatchesPrecomputed,
	MIN_OCCURRENCES_AT_LEAST_TWICE,
	MIN_OCCURRENCES_DEFAULT,
	toPrecomputedAbstractProgression,
	type ProgressionMatchFilterOptions
} from "./match.js";
import {
	parseSongTitleAndSectionLabel,
	resolveSongKey
} from "../songIdentity.js";
import type {
	GroupedSongSearchResult,
	ParsedProgressionChord,
	PreparedSong,
	PrecomputedAbstractProgression,
	ProgressionChordInput,
	SongInput,
	SongSearchResult,
	SongSectionSearchResult,
	StructuredChord,
	SubProgressionMatch
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

const prepareSong = (song: SongInput, index: number): PreparedSong => {
	const parsedProgression = dedupeAdjacentParsedProgression(
		song.progression.map(parseProgressionChord)
	);

	return {
		...song,
		id: song.id ?? `local-${index}`,
		parsedProgression,
		abstractProgression: toPrecomputedAbstractProgression(parsedProgression)
	};
};

const toEffectiveSearchProgression = (
	searchProgression: ParsedProgressionChord[],
	ignoreSlashBass: boolean
): ParsedProgressionChord[] =>
	dedupeAdjacentParsedProgression(
		ignoreSlashBass
			? searchProgression.map(
					({ bassPitchClass: _bass, ...chord }) =>
						chord as ParsedProgressionChord
				)
			: searchProgression
	);

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

const buildSectionsBySongKey = (
	preparedSongs: PreparedSong[]
): Map<string, PreparedSong[]> => {
	const sectionsBySongKey = new Map<string, PreparedSong[]>();

	for (const song of preparedSongs) {
		const songKey = resolveSongKey(song);
		const sections = sectionsBySongKey.get(songKey) ?? [];
		sectionsBySongKey.set(songKey, [...sections, song]);
	}

	return sectionsBySongKey;
};

const buildGroupedSongResult = (
	songKey: string,
	sections: PreparedSong[],
	hasChords: boolean,
	sectionMatchCache: Map<string, SubProgressionMatch[]>,
	searchProgression: ParsedProgressionChord[],
	matchOptions: {
		fuzzySearch?: boolean;
		matchAtBeginningOnly?: boolean;
		matchAtLeastTwice?: boolean;
	}
): GroupedSongSearchResult => {
	const primarySection = sections[0];
	const { baseTitle } = parseSongTitleAndSectionLabel(primarySection.title);

	const sectionResults: SongSectionSearchResult[] = sections.map((section) => {
		const { sectionLabel } = parseSongTitleAndSectionLabel(section.title);
		const cachedMatches = section.id
			? sectionMatchCache.get(section.id)
			: undefined;
		const matches = hasChords
			? (cachedMatches ??
				buildSongResult(section, searchProgression, matchOptions).matches)
			: [];

		return {
			sectionLabel,
			parsedProgression: section.parsedProgression,
			matches
		};
	});

	return {
		songKey,
		title: baseTitle,
		artists: primarySection.artists,
		...(primarySection.year !== undefined ? { year: primarySection.year } : {}),
		...(primarySection.source !== undefined
			? { source: primarySection.source }
			: {}),
		...(primarySection.popularityScore !== undefined
			? { popularityScore: primarySection.popularityScore }
			: {}),
		...(primarySection.inTop10 !== undefined
			? { inTop10: primarySection.inTop10 }
			: {}),
		...(primarySection.inTop40 !== undefined
			? { inTop40: primarySection.inTop40 }
			: {}),
		...(primarySection.inTop100 !== undefined
			? { inTop100: primarySection.inTop100 }
			: {}),
		sections: sectionResults
	};
};

export const createProgressionSearch = ({
	songs,
	limit = Infinity
}: {
	songs: SongInput[];
	limit?: number;
}) => {
	const preparedSongs = songs.map((song, index) => prepareSong(song, index));
	const sectionsBySongKey = buildSectionsBySongKey(preparedSongs);

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

		const effectiveProgression = toEffectiveSearchProgression(
			searchProgression,
			ignoreSlashBass
		);

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

	const getGroupedResults = ({
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
	} = {}): GroupedSongSearchResult[] => {
		const hasChords = searchProgression.length > 0;

		const effectiveProgression = toEffectiveSearchProgression(
			searchProgression,
			ignoreSlashBass
		);

		const matchOptions = {
			fuzzySearch,
			matchAtBeginningOnly,
			matchAtLeastTwice
		};

		const matchedSongKeys: string[] = [];
		const seenSongKeys = new Set<string>();
		const sectionMatchCache = new Map<string, SubProgressionMatch[]>();

		for (const song of preparedSongs) {
			if (selectedArtist && !matchesSelectedArtist(song, selectedArtist))
				continue;
			if (titleFilter && !matchesTitle(song, titleFilter)) continue;

			const songKey = resolveSongKey(song);

			if (hasChords) {
				const result = buildSongResult(
					song,
					effectiveProgression,
					matchOptions
				);
				if (song.id) sectionMatchCache.set(song.id, result.matches);
				if (!isMatched(result)) continue;
			}

			if (seenSongKeys.has(songKey)) continue;

			seenSongKeys.add(songKey);
			matchedSongKeys.push(songKey);
			if (matchedSongKeys.length >= resultLimit) break;
		}

		return matchedSongKeys.map((songKey) =>
			buildGroupedSongResult(
				songKey,
				sectionsBySongKey.get(songKey) ?? [],
				hasChords,
				sectionMatchCache,
				effectiveProgression,
				matchOptions
			)
		);
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
		getResults,
		getGroupedResults
	};
};

export {
	dedupeAdjacentParsedProgression,
	dedupeAdjacentProgressionInputs,
	progressionChordInputsAreEqual
} from "./dedupe.js";
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
