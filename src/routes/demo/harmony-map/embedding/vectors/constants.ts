export const MIN_GAP_DOCUMENT_FREQUENCY = 4;

export const CHORUS_MATCH_WEIGHT = 3;

export type ProgressionWeighting = "raw" | "binary";

export type SongVectorOptions = {
	weighting: ProgressionWeighting;
	useTfIdf: boolean;
	l2Normalize: boolean;
	weightChorus: boolean;
};

export const DEFAULT_SONG_VECTOR_OPTIONS: SongVectorOptions = {
	weighting: "raw",
	useTfIdf: true,
	l2Normalize: true,
	weightChorus: true
};

export const DEFAULT_NEAREST_NEIGHBOR_COUNT = 8;

// Per-block blend weights for the "blend" embedding method.
// Each weight scales one L2-normalized block before concatenation; cosine on the
// result is a weighted average of per-block cosines with weights proportional to
// weight². A weight of 0 removes that block entirely.
export type BlendWeights = {
	identity: number;
	content: number;
	groupShare: number;
	axes: number;
	// 0–1: supervised UMAP pull towards core-progression groups. 0 = off.
	groupPull: number;
};

export const DEFAULT_BLEND_WEIGHTS: BlendWeights = {
	identity: 1,
	content: 1,
	groupShare: 0,
	axes: 0,
	groupPull: 0
};

// UMAP nNeighbors used for content/blend methods. Larger values improve global
// cluster placement at the cost of local structure; 40 is the sweet spot for
// corpora in the hundreds-of-songs range.
export const GLOBAL_STRUCTURE_NEIGHBOR_COUNT = 40;

export const MINOR_SCALE_DARKNESS_WEIGHT = 0.5;
export const MINOR_QUALITY_DARKNESS_WEIGHT = 0.35;
export const FLAT_DEGREE_DARKNESS_WEIGHT = 0.15;
export const CORE_GROUP_DARKNESS_BLEND = 0.35;

export const DISTINCT_PROGRESSION_COMPLEXITY_WEIGHT = 0.4;
export const HARMONIC_BREADTH_COMPLEXITY_WEIGHT = 0.35;
export const EXTENSION_COMPLEXITY_WEIGHT = 0.25;

export const COMPLEXITY_SATURATION_PROGRESSION_COUNT = 8;
export const MIN_HARMONIC_BREADTH_DEGREES = 2;
export const MAX_HARMONIC_BREADTH_DEGREES = 5;
