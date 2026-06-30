import { simplifySuffix } from "../chord-processing/chord-classifier/fuzzySuffixMap.js";
import {
	applyProgressionMatchFilters,
	findSubProgressionMatchesPrecomputedFromAbstract,
	MIN_OCCURRENCES_AT_LEAST_TWICE,
	MIN_OCCURRENCES_DEFAULT
} from "../chord-processing/match-chord-progressions/match.js";
import type {
	AbstractProgression,
	PrecomputedAbstractProgression,
	SubProgressionMatch
} from "../chord-processing/types.js";
import type { SongResultsWorkerEntry } from "./songResultsIndex.js";
import { matchesYearRange, type YearRangeFilter } from "./yearRangeFilter.js";

export type SongResultsChunkFilters = {
	hasSearchChords: boolean;
	titleFilter: string;
	selectedArtist: string;
	yearRange: YearRangeFilter | null;
	fuzzySearch: boolean;
	matchAtBeginningOnly: boolean;
	matchAtLeastTwice: boolean;
};

export type SongResultsPartial = {
	matchedSongKeys: string[];
	sectionMatches: Array<{ id: string; matches: SubProgressionMatch[] }>;
};

const withSimplifiedAbstractSuffixes = (
	abstractProgression: PrecomputedAbstractProgression
): PrecomputedAbstractProgression => ({
	...abstractProgression,
	suffixes: abstractProgression.suffixes.map(simplifySuffix)
});

const withSimplifiedSearchAbstract = (
	searchAbstract: AbstractProgression
): AbstractProgression => ({
	...searchAbstract,
	suffixes: searchAbstract.suffixes.map(simplifySuffix)
});

const toSongAbstract = (
	entry: SongResultsWorkerEntry
): PrecomputedAbstractProgression => ({
	suffixes: entry.suffixes,
	deltas: entry.deltas,
	bassIntervals: entry.bassIntervals,
	wrapDelta: entry.wrapDelta
});

const matchesTitle = (titleLower: string, filter: string): boolean =>
	titleLower.includes(filter.toLowerCase());

const matchesSelectedArtist = (artists: string[], artist: string): boolean =>
	artists.includes(artist);

const findSectionMatches = (
	entry: SongResultsWorkerEntry,
	searchAbstract: AbstractProgression,
	filters: SongResultsChunkFilters
): SubProgressionMatch[] => {
	const songAbstract = filters.fuzzySearch
		? withSimplifiedAbstractSuffixes(toSongAbstract(entry))
		: toSongAbstract(entry);
	const effectiveSearchAbstract = filters.fuzzySearch
		? withSimplifiedSearchAbstract(searchAbstract)
		: searchAbstract;

	// matchAtLeastTwice is intentionally not applied here — it's enforced at the
	// song level (across all sections) in matchSongResultsChunk below.
	return applyProgressionMatchFilters(
		findSubProgressionMatchesPrecomputedFromAbstract(
			songAbstract,
			effectiveSearchAbstract
		),
		{ matchAtBeginningOnly: filters.matchAtBeginningOnly }
	);
};

export const matchSongResultsChunk = (
	chunk: SongResultsWorkerEntry[],
	filters: SongResultsChunkFilters,
	searchAbstract: AbstractProgression | null
): SongResultsPartial => {
	const normalizedTitle = filters.titleFilter.trim();
	const orderedSongKeys: string[] = [];
	const seenSongKeys = new Set<string>();
	const sectionMatches: Array<{ id: string; matches: SubProgressionMatch[] }> = [];
	const songTotalMatches = new Map<string, number>();

	for (const entry of chunk) {
		if (filters.selectedArtist && !matchesSelectedArtist(entry.artists, filters.selectedArtist))
			continue;
		if (!matchesYearRange(entry.year, filters.yearRange)) continue;
		if (normalizedTitle && !matchesTitle(entry.titleLower, normalizedTitle)) continue;

		if (filters.hasSearchChords) {
			if (!searchAbstract) continue;

			const matches = findSectionMatches(entry, searchAbstract, filters);
			sectionMatches.push({ id: entry.id, matches });

			if (matches.length > 0) {
				songTotalMatches.set(
					entry.songKey,
					(songTotalMatches.get(entry.songKey) ?? 0) + matches.length
				);
			}
		}

		if (!seenSongKeys.has(entry.songKey)) {
			seenSongKeys.add(entry.songKey);
			orderedSongKeys.push(entry.songKey);
		}
	}

	const minOccurrences = filters.matchAtLeastTwice
		? MIN_OCCURRENCES_AT_LEAST_TWICE
		: MIN_OCCURRENCES_DEFAULT;

	const matchedSongKeys = filters.hasSearchChords
		? orderedSongKeys.filter((key) => (songTotalMatches.get(key) ?? 0) >= minOccurrences)
		: orderedSongKeys;

	return { matchedSongKeys, sectionMatches };
};
