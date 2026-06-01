import { simplifySuffix } from "../chord-processing/chord-classifier/fuzzySuffixMap.js";
import {
	applyProgressionMatchFilters,
	findSubProgressionMatchesPrecomputedFromAbstract,
	isPositionInMatch,
	MIN_OCCURRENCES_AT_LEAST_TWICE,
	MIN_OCCURRENCES_DEFAULT,
	type ProgressionMatchFilterOptions
} from "../chord-processing/match-chord-progressions/match.js";
import { romanTokensToPrecomputedAbstract } from "../chord-processing/romanNumerals.js";
import type { AbstractProgression } from "../chord-processing/types.js";

export type RomanTokenSearchMatchOptions = ProgressionMatchFilterOptions & {
	fuzzySearch: boolean;
	matchAtLeastTwice?: boolean;
};

const withSimplifiedAbstractSuffixes = (
	abstract: ReturnType<typeof romanTokensToPrecomputedAbstract>
): ReturnType<typeof romanTokensToPrecomputedAbstract> =>
	abstract
		? {
				...abstract,
				suffixes: abstract.suffixes.map(simplifySuffix)
			}
		: null;

export const findSearchMatchesInRomanTokens = (
	romanTokens: string[],
	searchAbstract: AbstractProgression,
	options: RomanTokenSearchMatchOptions
) => {
	const sequenceAbstract = romanTokensToPrecomputedAbstract(romanTokens);
	if (!sequenceAbstract) return [];

	const effectiveSequenceAbstract = options.fuzzySearch
		? withSimplifiedAbstractSuffixes(sequenceAbstract)
		: sequenceAbstract;
	if (!effectiveSequenceAbstract) return [];

	return applyProgressionMatchFilters(
		findSubProgressionMatchesPrecomputedFromAbstract(
			effectiveSequenceAbstract,
			searchAbstract,
			{ wrap: false }
		),
		options
	);
};

export const romanTokenSequenceMatchesSearch = (
	romanTokens: string[],
	searchAbstract: AbstractProgression,
	options: RomanTokenSearchMatchOptions
): boolean =>
	findSearchMatchesInRomanTokens(romanTokens, searchAbstract, {
		...options,
		minOccurrences: MIN_OCCURRENCES_DEFAULT
	}).length > 0;

export const isRomanTokenPositionHighlighted = (
	position: number,
	romanTokens: string[],
	searchAbstract: AbstractProgression | null,
	{
		fuzzySearch,
		matchAtBeginningOnly,
		matchAtLeastTwice
	}: RomanTokenSearchMatchOptions
): boolean => {
	if (!searchAbstract || romanTokens.length === 0) return false;

	const matches = findSearchMatchesInRomanTokens(romanTokens, searchAbstract, {
		fuzzySearch,
		matchAtBeginningOnly,
		matchAtLeastTwice,
		minOccurrences: matchAtLeastTwice
			? MIN_OCCURRENCES_AT_LEAST_TWICE
			: MIN_OCCURRENCES_DEFAULT
	});

	return matches.some((match) =>
		isPositionInMatch(position, match, romanTokens.length)
	);
};
