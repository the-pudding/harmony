export type ReducerMethod = "umap" | "pca";
export type EmbeddingMethod =
	| ReducerMethod
	| "feature"
	| "groupBlend"
	| "ngram"
	| "scaleSplit";

export const REDUCER_METHODS: ReducerMethod[] = ["umap", "pca"];
export const EMBEDDING_METHODS: EmbeddingMethod[] = [
	...REDUCER_METHODS,
	"feature",
	"groupBlend",
	"ngram",
	"scaleSplit"
];

// Every method whose 2D layout actually comes from running UMAP on BOTH axes
// (just over different input vectors) — density clustering only makes sense
// for these, since it relies on UMAP's neighbor-preserving property across
// the whole plane. PCA, feature axes, and scaleSplit all substitute at least
// one axis for a linear or hand-designed projection where geometric
// proximity along that axis doesn't carry that same meaning.
export const UMAP_DRIVEN_METHODS: EmbeddingMethod[] = ["umap", "groupBlend", "ngram"];

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
