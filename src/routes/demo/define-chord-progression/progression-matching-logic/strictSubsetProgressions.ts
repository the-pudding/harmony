import type { ProgressionWithMatchStats } from "./progressionMatchAnalysis.js";

export const isContiguousRun = (
	shorter: string[],
	longer: string[]
): boolean => {
	if (shorter.length >= longer.length) return false;
	const limit = longer.length - shorter.length;
	for (let start = 0; start <= limit; start++) {
		if (shorter.every((token, i) => longer[start + i] === token)) return true;
	}
	return false;
};

export const findStrictSubsetKeys = (
	matches: ProgressionWithMatchStats[]
): Set<string> => {
	const result = new Set<string>();
	for (const candidate of matches) {
		const candidateTokens = candidate.chordProgression.split("-");
		const isSubset = matches.some(
			(other) =>
				other.chordProgression !== candidate.chordProgression &&
				other.coveragePercent > candidate.coveragePercent &&
				isContiguousRun(candidateTokens, other.chordProgression.split("-"))
		);
		if (isSubset) result.add(candidate.chordProgression);
	}
	return result;
};

export const applySubsetFlag = <T extends ProgressionWithMatchStats>(
	matches: T[],
	subsetKeys: Set<string>
): (T & { isStrictSubset: boolean })[] =>
	matches.map((match) => ({
		...match,
		isStrictSubset: subsetKeys.has(match.chordProgression)
	}));
