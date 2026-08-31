import { PCA } from "ml-pca";

export const PRE_REDUCE_COMPONENT_COUNT = 40;

// Truncated SVD to a lower-dimensional dense space before UMAP.
// UMAP with a large sparse input (~300+ dims) has poor global structure because
// cosine distance in very high-dim sparse spaces is noisy. Reducing to ~40 dense
// components first makes inter-cluster distances meaningful and lets UMAP use a
// larger nNeighbors (which it otherwise caps at n-1 for small matrices).
export const preReduce = (
	matrix: number[][],
	nComponents: number = PRE_REDUCE_COMPONENT_COUNT
): number[][] => {
	const cols = matrix[0]?.length ?? 0;
	if (matrix.length < 2 || cols <= nComponents) return matrix;
	const pca = new PCA(matrix, { center: true, scale: false });
	return pca.predict(matrix, { nComponents }).to2DArray();
};
