export type ReducerMethod = "umap" | "pca";
export type EmbeddingMethod = ReducerMethod | "feature";

export const REDUCER_METHODS: ReducerMethod[] = ["umap", "pca"];
export const EMBEDDING_METHODS: EmbeddingMethod[] = [
	...REDUCER_METHODS,
	"feature"
];

export const isEmbeddingMethod = (value: string): value is EmbeddingMethod =>
	(EMBEDDING_METHODS as string[]).includes(value);

export type Coords = { x: number; y: number };

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
