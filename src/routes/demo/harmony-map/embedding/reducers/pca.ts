import { PCA } from "ml-pca";
import {
	EMPTY_REDUCTION_RESULT,
	type ComponentLoading,
	type ReductionResult
} from "./types.js";

export const PCA_COMPONENT_COUNT = 2;
export const TOP_LOADINGS_PER_COMPONENT = 8;

const MIN_ROWS_FOR_PCA = 2;

const toComponentLoadings = (loadings: number[]): ComponentLoading[] =>
	loadings
		.map((loading, featureIndex) => ({ featureIndex, loading }))
		.sort((first, second) => Math.abs(second.loading) - Math.abs(first.loading))
		.slice(0, TOP_LOADINGS_PER_COMPONENT);

export const runPca = (matrix: number[][]): ReductionResult => {
	if (matrix.length < MIN_ROWS_FOR_PCA || (matrix[0]?.length ?? 0) === 0) {
		return EMPTY_REDUCTION_RESULT;
	}

	const pca = new PCA(matrix, { center: true, scale: false });
	const projected = pca
		.predict(matrix, { nComponents: PCA_COMPONENT_COUNT })
		.to2DArray();
	const loadings = pca.getLoadings().to2DArray();

	return {
		coords: projected.map(([x, y]) => ({ x, y: y ?? 0 })),
		componentLoadings: loadings
			.slice(0, PCA_COMPONENT_COUNT)
			.map(toComponentLoadings),
		explainedVariance: pca.getExplainedVariance().slice(0, PCA_COMPONENT_COUNT)
	};
};
