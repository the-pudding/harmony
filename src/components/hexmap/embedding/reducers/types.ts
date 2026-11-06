export type ReducerMethod = "umap" | "pca";
export type EmbeddingMethod =
	| ReducerMethod
	| "feature"
	| "groupBlend"
	| "ngram"
	| "scaleSplit"
	| "content"
	| "blend";

export const REDUCER_METHODS: ReducerMethod[] = ["umap", "pca"];
export const EMBEDDING_METHODS: EmbeddingMethod[] = [
	...REDUCER_METHODS,
	"feature",
	"groupBlend",
	"ngram",
	"scaleSplit",
	"content",
	"blend"
];

// Every method whose 2D layout actually comes from running UMAP on BOTH axes
// (just over different input vectors) — density clustering only makes sense
// for these, since it relies on UMAP's neighbor-preserving property across
// the whole plane. PCA, feature axes, and scaleSplit all substitute at least
// one axis for a linear or hand-designed projection where geometric
// proximity along that axis doesn't carry that same meaning.
export const UMAP_DRIVEN_METHODS: EmbeddingMethod[] = [
	"umap",
	"groupBlend",
	"ngram",
	"content",
	"blend"
];

// Options passed to runUmap for custom UMAP runs. All fields are optional;
// omitted fields fall back to the module-level defaults so existing methods
// are not affected.
export type UmapOptions = {
	nNeighbors?: number;
	minDist?: number;
	spread?: number;
	// SVD-pre-reduce the matrix to this many components before UMAP. When set
	// and the matrix has more columns than this value, PCA is run first.
	preReduceComponents?: number;
	// Supervised UMAP: one integer label per row (same length as matrix).
	// -1 means "unknown" and does not pull toward any group.
	supervisedLabels?: number[];
	supervisedWeight?: number;
};

export const isEmbeddingMethod = (value: string): value is EmbeddingMethod =>
	(EMBEDDING_METHODS as string[]).includes(value);

export const EMBEDDING_DIMENSIONS = [2, 3] as const;
export type EmbeddingDimension = (typeof EMBEDDING_DIMENSIONS)[number];

export type Coords = { x: number; y: number; z?: number };

export type ComponentLoading = {
	featureIndex: number;
	loading: number;
};

export type ReductionResult = {
	coords: Coords[];
	componentLoadings: ComponentLoading[][] | null;
	explainedVariance: number[] | null;
};

export const EMPTY_REDUCTION_RESULT: ReductionResult = {
	coords: [],
	componentLoadings: null,
	explainedVariance: null
};
