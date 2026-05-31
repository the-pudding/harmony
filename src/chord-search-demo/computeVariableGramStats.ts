import { gramLabel } from "../chord-processing/romanNumerals.js";

export type ChartSection = {
	romanTokens: string[];
	songKey: string;
};

export type VariableGramStat = {
	label: string;
	length: number;
	occurrences: number;
	songCount: number;
};

export type ComputeVariableGramStatsOptions = {
	topN: number;
	minLen: number;
	maxLen: number;
};

export type PartialGramStats = {
	gramCounts: [string, number][];
	gramSongKeys: [string, string[]][];
};

const finalizeTopGramStats = (
	gramCounts: Map<string, number>,
	gramSongs: Map<string, Set<string>>,
	topN: number
): VariableGramStat[] =>
	[...gramCounts.entries()]
		.sort(([, aCount], [, bCount]) => bCount - aCount)
		.slice(0, topN)
		.map(([gram, occurrences]) => {
			const tokens = gram.split(",");
			return {
				label: gramLabel(tokens),
				length: tokens.length,
				occurrences,
				songCount: gramSongs.get(gram)?.size ?? 0
			};
		});

export const computePartialGramStats = (
	sections: ChartSection[],
	{ minLen, maxLen }: Pick<ComputeVariableGramStatsOptions, "minLen" | "maxLen">
): PartialGramStats => {
	const gramCounts = new Map<string, number>();
	const gramSongs = new Map<string, Set<string>>();

	for (const { romanTokens, songKey } of sections) {
		const seenInSection = new Set<string>();

		for (let len = minLen; len <= maxLen; len++) {
			for (let index = 0; index + len <= romanTokens.length; index++) {
				const gram = romanTokens.slice(index, index + len).join(",");
				gramCounts.set(gram, (gramCounts.get(gram) ?? 0) + 1);
				seenInSection.add(gram);
			}
		}

		for (const gram of seenInSection) {
			const songsForGram = gramSongs.get(gram) ?? new Set<string>();
			songsForGram.add(songKey);
			gramSongs.set(gram, songsForGram);
		}
	}

	return {
		gramCounts: [...gramCounts.entries()],
		gramSongKeys: [...gramSongs.entries()].map(([gram, songKeys]) => [
			gram,
			[...songKeys]
		])
	};
};

export const mergePartialGramStats = (
	partials: PartialGramStats[],
	{ topN }: Pick<ComputeVariableGramStatsOptions, "topN">
): VariableGramStat[] => {
	const gramCounts = new Map<string, number>();
	const gramSongs = new Map<string, Set<string>>();

	for (const partial of partials) {
		for (const [gram, count] of partial.gramCounts) {
			gramCounts.set(gram, (gramCounts.get(gram) ?? 0) + count);
		}

		for (const [gram, songKeys] of partial.gramSongKeys) {
			const songsForGram = gramSongs.get(gram) ?? new Set<string>();
			songKeys.forEach((songKey) => songsForGram.add(songKey));
			gramSongs.set(gram, songsForGram);
		}
	}

	return finalizeTopGramStats(gramCounts, gramSongs, topN);
};

export const computeVariableGramStats = (
	sections: ChartSection[],
	options: ComputeVariableGramStatsOptions
): VariableGramStat[] =>
	mergePartialGramStats([computePartialGramStats(sections, options)], options);
