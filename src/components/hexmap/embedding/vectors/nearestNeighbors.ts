import { DEFAULT_NEAREST_NEIGHBOR_COUNT } from "./constants.js";
import type { SongVector } from "./songVectors.js";

export type SongNeighbor = {
	songKey: string;
	similarity: number;
};

export const cosineSimilarity = (
	first: readonly number[],
	second: readonly number[]
): number => {
	const totals = first.reduce(
		(accumulator, value, index) => {
			const other = second[index] ?? 0;
			return {
				dot: accumulator.dot + value * other,
				firstNorm: accumulator.firstNorm + value * value,
				secondNorm: accumulator.secondNorm + other * other
			};
		},
		{ dot: 0, firstNorm: 0, secondNorm: 0 }
	);
	const denominator =
		Math.sqrt(totals.firstNorm) * Math.sqrt(totals.secondNorm);
	return denominator === 0 ? 0 : totals.dot / denominator;
};

export const findNearestNeighbors = (
	target: SongVector,
	vectors: readonly SongVector[],
	neighborCount: number = DEFAULT_NEAREST_NEIGHBOR_COUNT
): SongNeighbor[] =>
	vectors
		.filter((vector) => vector.songKey !== target.songKey)
		.map((vector) => ({
			songKey: vector.songKey,
			similarity: cosineSimilarity(target.weighted, vector.weighted)
		}))
		.filter(({ similarity }) => similarity > 0)
		.sort((first, second) => second.similarity - first.similarity)
		.slice(0, neighborCount);
