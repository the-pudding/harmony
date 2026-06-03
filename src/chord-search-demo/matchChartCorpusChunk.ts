import { simplifySuffix } from "../chord-processing/chord-classifier/fuzzySuffixMap.js";
import {
	applyProgressionMatchFilters,
	findSubProgressionMatchesPrecomputedFromAbstract,
	MIN_OCCURRENCES_AT_LEAST_TWICE,
	MIN_OCCURRENCES_DEFAULT
} from "../chord-processing/match-chord-progressions/match.js";
import type {
	AbstractProgression,
	PrecomputedAbstractProgression
} from "../chord-processing/types.js";
import type { ChartSongIndexEntry } from "./chartSongIndex.js";
import type { ChartSection } from "./computeVariableGramStats.js";
import { matchesYearRange, type YearRangeFilter } from "./yearRangeFilter.js";

export type ChartChunkFilters = {
	hasSearchChords: boolean;
	titleFilter: string;
	selectedArtist: string;
	yearRange: YearRangeFilter | null;
	allowedSongKeys: readonly string[] | null;
	fuzzySearch: boolean;
	matchAtBeginningOnly: boolean;
	matchAtLeastTwice: boolean;
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

const toSongAbstract = (entry: ChartSongIndexEntry): PrecomputedAbstractProgression => ({
	suffixes: entry.suffixes,
	deltas: entry.deltas,
	bassIntervals: entry.bassIntervals,
	wrapDelta: entry.wrapDelta
});

const matchesTitle = (title: string, filter: string): boolean =>
	title.toLowerCase().includes(filter.toLowerCase());

const matchesSelectedArtist = (artists: string[], artist: string): boolean =>
	artists.includes(artist);

const matchesSearch = (
	entry: ChartSongIndexEntry,
	searchAbstract: AbstractProgression,
	filters: ChartChunkFilters
): boolean => {
	const songAbstract = filters.fuzzySearch
		? withSimplifiedAbstractSuffixes(toSongAbstract(entry))
		: toSongAbstract(entry);
	const effectiveSearchAbstract = filters.fuzzySearch
		? withSimplifiedSearchAbstract(searchAbstract)
		: searchAbstract;
	const matches = applyProgressionMatchFilters(
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

	return matches.length > 0;
};

export const matchChartCorpusChunk = (
	chunk: ChartSongIndexEntry[],
	filters: ChartChunkFilters,
	searchAbstract: AbstractProgression | null
): ChartSection[] => {
	const normalizedTitle = filters.titleFilter.trim();

	const allowedSongKeys = filters.allowedSongKeys
		? new Set(filters.allowedSongKeys)
		: null;

	return chunk
		.filter((entry) => {
			if (allowedSongKeys && !allowedSongKeys.has(entry.songKey)) return false;
			if (filters.selectedArtist && !matchesSelectedArtist(entry.artists, filters.selectedArtist))
				return false;
			if (!matchesYearRange(entry.year, filters.yearRange)) return false;
			if (normalizedTitle && !matchesTitle(entry.title, normalizedTitle)) return false;
			if (filters.hasSearchChords) {
				if (!searchAbstract) return false;
				return matchesSearch(entry, searchAbstract, filters);
			}
			return true;
		})
		.map(({ romanTokens, songKey }) => ({ romanTokens, songKey }));
};
