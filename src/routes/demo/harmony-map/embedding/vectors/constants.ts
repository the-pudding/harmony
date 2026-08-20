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
