import { UMAP } from "umap-js";
import { cosineSimilarity } from "../vectors/nearestNeighbors.js";
import { EMPTY_REDUCTION_RESULT, type ReductionResult } from "./types.js";

export const UMAP_RANDOM_SEED = 42;
export const UMAP_NEIGHBOR_COUNT = 15;
export const UMAP_MIN_DISTANCE = 0.15;
export const UMAP_SPREAD = 1.2;
export const UMAP_COMPONENT_COUNT_2D = 2;
export const UMAP_COMPONENT_COUNT_3D = 3;

const MIN_ROWS_FOR_UMAP = 3;
const MIN_NEIGHBORS = 2;

// Deterministic PRNG so re-running the same corpus yields the same layout.
const seededRandom = (seed: number): (() => number) => {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		const mixed = Math.imul(state ^ (state >>> 15), 1 | state);
		const scrambled =
			(mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
		return ((scrambled ^ (scrambled >>> 14)) >>> 0) / 4294967296;
	};
};

const cosineDistance = (first: number[], second: number[]): number =>
	1 - cosineSimilarity(first, second);

export const runUmap = (
	matrix: number[][],
	componentCount: number = UMAP_COMPONENT_COUNT_2D
): ReductionResult => {
	if (matrix.length < MIN_ROWS_FOR_UMAP || (matrix[0]?.length ?? 0) === 0) {
		return EMPTY_REDUCTION_RESULT;
	}

	const umap = new UMAP({
		nComponents: componentCount,
		nNeighbors: Math.max(
			MIN_NEIGHBORS,
			Math.min(UMAP_NEIGHBOR_COUNT, matrix.length - 1)
		),
		minDist: UMAP_MIN_DISTANCE,
		spread: UMAP_SPREAD,
		distanceFn: cosineDistance,
		random: seededRandom(UMAP_RANDOM_SEED)
	});

	return {
		coords: umap.fit(matrix).map(([x, y, z]) =>
			componentCount >= UMAP_COMPONENT_COUNT_3D
				? { x, y: y ?? 0, z: z ?? 0 }
				: { x, y: y ?? 0 }
		),
		componentLoadings: null,
		explainedVariance: null
	};
};
