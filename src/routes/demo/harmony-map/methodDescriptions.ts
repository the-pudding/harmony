import type { EmbeddingMethod } from "./embedding/reducers/types.js";

export type MethodDescription = {
	title: string;
	summary: string;
	rationale: string;
	approach: string;
	tradeoffs: string;
};

export const embeddingMethodLabels: Record<EmbeddingMethod, string> = {
	umap: "UMAP",
	pca: "PCA",
	feature: "Feature axes"
};

export const embeddingMethodDescriptions: Record<
	EmbeddingMethod,
	MethodDescription
> = {
	umap: {
		title: embeddingMethodLabels.umap,
		summary:
			"Neighborhood-preserving nonlinear projection of the TF-IDF progression vectors.",
		rationale:
			"Best at revealing clusters: songs that share rare progressions land near each other even when the overall vectors are sparse and high-dimensional.",
		approach:
			"UMAP builds a fuzzy nearest-neighbor graph under cosine distance, then optimizes a 2D layout that preserves that local structure. A fixed random seed keeps the layout stable between runs.",
		tradeoffs:
			"Axes carry no meaning and global distances are unreliable — two far-apart clusters are not necessarily twice as different as two nearby ones. It is stochastic and sensitive to the neighbor count."
	},
	pca: {
		title: embeddingMethodLabels.pca,
		summary:
			"Linear projection onto the two directions of greatest variance, with readable axes.",
		rationale:
			"Deterministic and interpretable: each axis is a weighted combination of chord progressions, so you can read off which progressions push a song left or right.",
		approach:
			"The song × progression TF-IDF matrix is centered and decomposed; songs are projected onto the first two principal components. Component loadings list the progressions that define each axis.",
		tradeoffs:
			"Only captures linear structure. With sparse progression vectors the first two components often explain a small share of the variance, smearing fine cluster structure into a blob."
	},
	feature: {
		title: embeddingMethodLabels.feature,
		summary:
			"Hand-designed axes: bright ↔ dark harmony against simple ↔ complex harmony.",
		rationale:
			"The most legible map — you can predict where a song will land before looking. Useful as a sanity check on what the learned embeddings are picking up.",
		approach:
			"Brightness blends each matched progression's scale, chord qualities and flattened degrees with the brightness of the core group it belongs to. Complexity blends distinct progression count, harmonic breadth and the share of extended chords. Both are weighted by how often each progression occurs in the song.",
		tradeoffs:
			"Reflects only the two chosen features rather than the full vector, so songs that differ in every other respect can collide. The weights are editorial choices, not learned from the corpus."
	}
};
