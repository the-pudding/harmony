import { gramLabel } from "../chord-processing/romanNumerals.js";
import type { AbstractProgression } from "../chord-processing/types.js";
import { romanTokenSequenceMatchesSearch } from "./searchMatchesInRomanTokens.js";

export type ChartSection = {
	romanTokens: string[];
	songKey: string;
};

export type SongChordMatchStats = {
	matchingChordCount: number;
	totalChordCount: number;
};

export type VariableGramStat = {
	label: string;
	length: number;
	occurrences: number;
	songCount: number;
	avgPctOfSong: number;
};

export type GramNormalizationOptions = {
	aggregateRepeats: boolean;
	canonicalizeRotations: boolean;
};

export type ComputeVariableGramStatsOptions = {
	topN: number;
	minNumChordsToCountAsAProgression: number;
	maxLen: number;
} & GramNormalizationOptions;

const tokensJoinKey = (tokens: string[]): string => tokens.join(",");

const isPeriodicWithPeriod = (
	tokens: string[],
	periodLength: number
): boolean =>
	tokens.every((token, index) => token === tokens[index % periodLength]);

export const minimalPeriod = (tokens: string[]): string[] => {
	if (tokens.length <= 1) return [...tokens];

	for (let periodLength = 1; periodLength < tokens.length; periodLength++) {
		if (isPeriodicWithPeriod(tokens, periodLength)) {
			return tokens.slice(0, periodLength);
		}
	}

	return [...tokens];
};

export const canonicalRotation = (tokens: string[]): string[] => {
	if (tokens.length <= 1) return [...tokens];

	let best = [...tokens];
	for (
		let rotationOffset = 1;
		rotationOffset < tokens.length;
		rotationOffset++
	) {
		const rotated = [
			...tokens.slice(rotationOffset),
			...tokens.slice(0, rotationOffset)
		];
		if (tokensJoinKey(rotated) < tokensJoinKey(best)) {
			best = rotated;
		}
	}

	return best;
};

export const normalizeGramTokens = (
	tokens: string[],
	{ aggregateRepeats, canonicalizeRotations }: GramNormalizationOptions
): string[] => {
	const afterRepeats = aggregateRepeats ? minimalPeriod(tokens) : [...tokens];
	const shouldCanonicalizeRotation = canonicalizeRotations || aggregateRepeats;

	return shouldCanonicalizeRotation
		? canonicalRotation(afterRepeats)
		: afterRepeats;
};

export type PartialGramStats = {
	gramCounts: [string, number][];
	gramSongKeys: [string, string[]][];
	gramSongChordStats: [string, [string, number, number][]][];
};

export type SearchGramFilter = {
	searchAbstract: AbstractProgression;
	fuzzySearch: boolean;
	matchAtBeginningOnly: boolean;
};

const avgPctOfSongForGram = (
	songKeys: Set<string> | undefined,
	chordStatsBySong: Map<string, SongChordMatchStats> | undefined
): number => {
	if (!songKeys?.size) return 0;
	let sumPct = 0;
	for (const songKey of songKeys) {
		const { matchingChordCount, totalChordCount } = chordStatsBySong?.get(
			songKey
		) ?? { matchingChordCount: 0, totalChordCount: 0 };
		sumPct +=
			totalChordCount > 0 ? (matchingChordCount / totalChordCount) * 100 : 0;
	}
	return sumPct / songKeys.size;
};

const finalizeTopGramStats = (
	gramCounts: Map<string, number>,
	gramSongs: Map<string, Set<string>>,
	gramSongChordStats: Map<string, Map<string, SongChordMatchStats>>,
	topN: number
): VariableGramStat[] =>
	[...gramCounts.entries()]
		.map(([gram, occurrences]) => {
			const tokens = gram.split(",");
			const songKeys = gramSongs.get(gram);
			const songCount = songKeys?.size ?? 0;
			return {
				label: gramLabel(tokens),
				length: tokens.length,
				occurrences,
				songCount,
				avgPctOfSong: avgPctOfSongForGram(
					songKeys,
					gramSongChordStats.get(gram)
				)
			};
		})
		.sort((a, b) => {
			if (b.songCount !== a.songCount) return b.songCount - a.songCount;
			return b.occurrences - a.occurrences;
		})
		.slice(0, topN);

export const computePartialGramStats = (
	sections: ChartSection[],
	options: Pick<
		ComputeVariableGramStatsOptions,
		| "minNumChordsToCountAsAProgression"
		| "maxLen"
		| "aggregateRepeats"
		| "canonicalizeRotations"
	>,
	searchGramFilter: SearchGramFilter | null = null
): PartialGramStats => {
	const { minNumChordsToCountAsAProgression, maxLen } = options;
	const gramCounts = new Map<string, number>();
	const gramSongs = new Map<string, Set<string>>();
	const gramSongChordStats = new Map<
		string,
		Map<string, SongChordMatchStats>
	>();

	for (const { romanTokens, songKey } of sections) {
		const totalChordCount = romanTokens.length;
		const seenInSection = new Set<string>();
		const matchingIndicesByGram = new Map<string, Set<number>>();

		for (let len = minNumChordsToCountAsAProgression; len <= maxLen; len++) {
			for (let index = 0; index + len <= totalChordCount; index++) {
				const gramTokens = romanTokens.slice(index, index + len);
				if (
					searchGramFilter &&
					!romanTokenSequenceMatchesSearch(
						gramTokens,
						searchGramFilter.searchAbstract,
						searchGramFilter
					)
				) {
					continue;
				}
				const normalizedTokens = normalizeGramTokens(gramTokens, options);
				if (normalizedTokens.length < minNumChordsToCountAsAProgression) {
					continue;
				}
				const gram = tokensJoinKey(normalizedTokens);
				gramCounts.set(gram, (gramCounts.get(gram) ?? 0) + 1);
				seenInSection.add(gram);
				const matchingIndices =
					matchingIndicesByGram.get(gram) ?? new Set<number>();
				for (let chordIndex = index; chordIndex < index + len; chordIndex++) {
					matchingIndices.add(chordIndex);
				}
				matchingIndicesByGram.set(gram, matchingIndices);
			}
		}

		for (const gram of seenInSection) {
			const songsForGram = gramSongs.get(gram) ?? new Set<string>();
			songsForGram.add(songKey);
			gramSongs.set(gram, songsForGram);

			const chordStatsForGram = gramSongChordStats.get(gram) ?? new Map();
			chordStatsForGram.set(songKey, {
				matchingChordCount: matchingIndicesByGram.get(gram)?.size ?? 0,
				totalChordCount
			});
			gramSongChordStats.set(gram, chordStatsForGram);
		}
	}

	return {
		gramCounts: [...gramCounts.entries()],
		gramSongKeys: [...gramSongs.entries()].map(([gram, songKeys]) => [
			gram,
			[...songKeys]
		]),
		gramSongChordStats: [...gramSongChordStats.entries()].map(
			([gram, statsBySong]) => [
				gram,
				[...statsBySong.entries()].map(
					([key, { matchingChordCount, totalChordCount }]) => [
						key,
						matchingChordCount,
						totalChordCount
					]
				)
			]
		)
	};
};

export const mergePartialGramStats = (
	partials: PartialGramStats[],
	{ topN }: Pick<ComputeVariableGramStatsOptions, "topN">
): VariableGramStat[] => {
	const gramCounts = new Map<string, number>();
	const gramSongs = new Map<string, Set<string>>();
	const gramSongChordStats = new Map<
		string,
		Map<string, SongChordMatchStats>
	>();

	for (const partial of partials) {
		for (const [gram, count] of partial.gramCounts) {
			gramCounts.set(gram, (gramCounts.get(gram) ?? 0) + count);
		}

		for (const [gram, songKeys] of partial.gramSongKeys) {
			const songsForGram = gramSongs.get(gram) ?? new Set<string>();
			songKeys.forEach((songKey) => songsForGram.add(songKey));
			gramSongs.set(gram, songsForGram);
		}

		for (const [gram, songStats] of partial.gramSongChordStats) {
			const chordStatsForGram = gramSongChordStats.get(gram) ?? new Map();
			for (const [songKey, matchingChordCount, totalChordCount] of songStats) {
				chordStatsForGram.set(songKey, { matchingChordCount, totalChordCount });
			}
			gramSongChordStats.set(gram, chordStatsForGram);
		}
	}

	return finalizeTopGramStats(gramCounts, gramSongs, gramSongChordStats, topN);
};

export const computeVariableGramStats = (
	sections: ChartSection[],
	options: ComputeVariableGramStatsOptions,
	searchGramFilter: SearchGramFilter | null = null
): VariableGramStat[] =>
	mergePartialGramStats(
		[computePartialGramStats(sections, options, searchGramFilter)],
		options
	);
