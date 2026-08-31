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
	feature: "Feature axes",
	groupBlend: "Group blend",
	ngram: "Chord grams",
	scaleSplit: "Major/minor",
	content: "Content",
	blend: "Blend"
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
	},
	groupBlend: {
		title: embeddingMethodLabels.groupBlend,
		summary:
			"UMAP over each song's core-group mix, so proximity tracks the dot color blend.",
		rationale:
			"UMAP and PCA cluster by which exact progressions occur, so two songs with the same group blend can still land far apart if the underlying progressions differ. This clusters directly by that blend instead — songs colored similarly on the map tend to sit near each other.",
		approach:
			"Each song becomes a short vector of core-group shares (the same fractions used to color its dot), one dimension per group, summing to 1. UMAP builds a neighbor graph over those vectors under cosine distance and lays out the 2D result, same as the UMAP method but on group shares instead of per-progression counts.",
		tradeoffs:
			"Ignores everything else about a song — gap-fill progressions, exact chord identities, occurrence counts beyond their group. Two songs with an identical blend from very different chords will still land on top of each other."
	},
	ngram: {
		title: embeddingMethodLabels.ngram,
		summary:
			"UMAP over each song's raw chord-to-chord transitions (2–3 chord windows), independent of core-progressions.ts entirely.",
		rationale:
			"Every other method's vector is built from which registered progressions matched a song — so the map is partly shaped by whatever's already been decided as core. This method skips named-progression matching altogether and looks at the raw sequence of chords instead, so it isn't biased by, or circular with, the current core-progressions.ts list.",
		approach:
			"For every song section, every 2- and 3-chord consecutive window of roman-numeral tokens (scale-qualified) becomes a 'gram.' Grams occurring in fewer than 4 songs corpus-wide are dropped; the rest form the vocabulary. Each song's gram-occurrence counts are TF-IDF-weighted and L2-normalized, the same formula as the standard method, then UMAP runs under cosine distance.",
		tradeoffs:
			"Loses the notion of a 'complete' progression — a song built on a real 4-chord vamp and one that just happens to share a couple of its transitions can look similar here. Chord direction matters (ii→V is a different gram from V→ii), so it won't unify songs that traverse the same chords in reverse."
	},
	scaleSplit: {
		title: embeddingMethodLabels.scaleSplit,
		summary:
			"One axis is a real UMAP clustering of chord grams; the other is a deliberate major ↔ minor score, so similar songs still group together but always split left/right by scale.",
		rationale:
			"Chord grams clusters by similarity but leaves scale to fall out however the layout happens to land. This forces the one axis you actually care about — major vs. minor — to always be legible, while keeping genuine similarity-based grouping on the other axis, the same idea as feature axes' hand-designed dimensions but built on chord-gram similarity instead of a fully hand-designed one.",
		approach:
			"The horizontal position is a majorness score per song: (major chord count − minor chord count) / total chord count, so +1 is entirely major, −1 entirely minor, 0 is an even split or unmatched. The vertical position is UMAP run on the same chord-gram vectors as the Chord grams method, keeping only one of its two natural output axes.",
		tradeoffs:
			"Discards half of what UMAP would normally show — whatever structure lived on the dropped axis is gone, so clusters can look flatter or more merged than under Chord grams. The horizontal position only counts scale, not chord quality or borrowed chords, so it's a cruder brightness signal than feature axes' — and because one axis is hand-designed, density clustering (the dashed circles) isn't available here."
	},
	content: {
		title: embeddingMethodLabels.content,
		summary:
			"UMAP over harmonic content of matched progressions — cyclic chord-grams, degree sets and cadences — rather than their identities.",
		rationale:
			"UMAP and Chord grams treat each progression as a bag of raw chord transitions, so vi-ii-V-I and ii-V-I share almost nothing. This method expands each matched progression into content features shared across related progressions, then weights by match count and chorus emphasis — so it inherits UMAP's noise filtering but gains harmonic relatedness. A larger neighbor count and SVD pre-reduction give it better global structure than the standard UMAP method.",
		approach:
			"For each song's selected progressions (core + gap-fill), every 2- and 3-chord cyclic window, sorted degree set, and cadence pair is extracted as a content key (scale-qualified). Keys are TF-IDF weighted and L2-normalised per song, then UMAP runs on the resulting matrix — pre-reduced to ~40 dims via SVD and with nNeighbors = 40 for global structure. The 2D output is rotated via Procrustes alignment so that dark-to-bright harmony points along +x and simple-to-complex along +y.",
		tradeoffs:
			"Loses exact progression identity: two songs with very different named progressions but similar chord vocabulary will land near each other. Cyclic grams make rotation-invariant loops identical, which is usually desirable but can merge intentionally reversed progressions. The orientation is a best-fit rotation, not exact, so the axes are approximate."
	},
	blend: {
		title: embeddingMethodLabels.blend,
		summary:
			"UMAP over a weighted mix of progression identity, harmonic content, core-group shares and brightness/complexity axes.",
		rationale:
			"The existing UMAP method clusters by exact progression identity while Content clusters by harmonic relatedness, but neither alone gives the full picture. Blend lets you dial in how much each family contributes, so you can start from today's identity clustering and gradually pull related progressions closer by increasing the content weight, or anchor the layout to the editorially-chosen groups by raising the group-share weight.",
		approach:
			"Each of the four feature families (identity, content, group share, hand axes) is L2-normalised independently, scaled by its slider weight, and concatenated. Cosine on the resulting vector is a weighted average of per-family cosine similarities (weights proportional to weight²). SVD pre-reduction to ~40 dims and UMAP with nNeighbors = 40 improve global structure. An optional group-pull slider activates supervised UMAP toward the core-progression groups. The 2D output is Procrustes-aligned to the brightness/complexity frame.",
		tradeoffs:
			"Four weights plus a group-pull make the parameter space large and easy to overfit by hand. Pre-reduction discards some within-family variance before UMAP, which can flatten fine cluster detail. Caching is per weight configuration, so each slider position triggers a fresh UMAP run."
	}
};

export const METHOD_DESCRIPTION_SECTIONS = [
	{ key: "rationale", label: "Why" },
	{ key: "approach", label: "How" },
	{ key: "tradeoffs", label: "Tradeoffs" }
] as const;
