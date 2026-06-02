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

	return applyProgressionMatchFilters(
		findSubProgressionMatchesPrecomputedFromAbstract(
			songAbstract,
			effectiveSearchAbstract
		),
		{
			matchAtBeginningOnly: filters.matchAtBeginningOnly,
			minOccurrences: filters.matchAtLeastTwice
				? MIN_OCCURRENCES_AT_LEAST_TWICE
				: MIN_OCCURRENCES_DEFAULT
		}
	);
};

export const matchSongResultsChunk = (
	chunk: SongResultsWorkerEntry[],
	filters: SongResultsChunkFilters,
	searchAbstract: AbstractProgression | null
): SongResultsPartial => {
	const normalizedTitle = filters.titleFilter.trim();
	const matchedSongKeys: string[] = [];
	const seenSongKeys = new Set<string>();
	const sectionMatches: Array<{ id: string; matches: SubProgressionMatch[] }> = [];

	for (const entry of chunk) {
		if (filters.selectedArtist && !matchesSelectedArtist(entry.artists, filters.selectedArtist))
			continue;
		if (!matchesYearRange(entry.year, filters.yearRange)) continue;
		if (normalizedTitle && !matchesTitle(entry.titleLower, normalizedTitle)) continue;

		if (filters.hasSearchChords) {
			if (!searchAbstract) continue;

			const matches = findSectionMatches(entry, searchAbstract, filters);
			sectionMatches.push({ id: entry.id, matches });
			if (matches.length === 0) continue;
		}

		if (seenSongKeys.has(entry.songKey)) continue;

		seenSongKeys.add(entry.songKey);
		matchedSongKeys.push(entry.songKey);
	}

	return { matchedSongKeys, sectionMatches };
};
