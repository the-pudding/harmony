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

export const computeVariableGramStats = (
	sections: ChartSection[],
	{ topN, minLen, maxLen }: ComputeVariableGramStatsOptions
): VariableGramStat[] => {
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

	return [...gramCounts.entries()]
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
};
