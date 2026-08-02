export type WeightingToggleKey = "useTfIdf" | "l2Normalize" | "binary";

export type WeightingDescription = {
	label: string;
	summary: string;
	rationale: string;
	approach: string;
	tradeoffs: string;
};

export const weightingDescriptions: Record<
	WeightingToggleKey,
	WeightingDescription
> = {
	useTfIdf: {
		label: "TF-IDF",
		summary:
			"Scales each progression count by how rare that progression is across the corpus.",
		rationale:
			"Common progressions (like Axis of Awesome) would otherwise dominate every song's vector. TF-IDF elevates distinctive matches so similarity reflects shared rare structure.",
		approach:
			"For each vocabulary dimension, multiply the song's count by idf = log((N+1)/(df+1))+1, where N is the number of songs and df is how many songs contain that progression.",
		tradeoffs:
			"A single rare match can outweigh several common ones. Turning TF-IDF off keeps raw (or binary) counts, which clusters songs by overall progression volume rather than distinctiveness."
	},
	l2Normalize: {
		label: "L2 norm",
		summary:
			"Rescales each song vector to unit length so cosine distance ignores overall magnitude.",
		rationale:
			"Songs with many matched progressions would otherwise sit farther from the origin and pull neighbors by volume. Unit-length vectors make similarity about direction (which progressions), not how busy the song is.",
		approach:
			"After optional TF-IDF scaling, divide every weight by the Euclidean norm of the vector. Empty vectors stay zeros.",
		tradeoffs:
			"You lose signal about how densely a song is covered. Off is useful when you want heavily annotated songs to separate from sparsely matched ones."
	},
	binary: {
		label: "binary counts",
		summary:
			"Collapses each progression to present/absent instead of counting occurrences.",
		rationale:
			"A progression that loops ten times should not outweigh one that appears once if you care about harmonic repertoire rather than repetition.",
		approach:
			"Any positive match count becomes 1 before TF-IDF. Sibling variants of one named core progression still share a vocabulary slot.",
		tradeoffs:
			"You ignore how central a progression is to the song. Off (raw counts) keeps frequency, so chorus-driving loops weigh more than a one-off bridge."
	}
};

export const WEIGHTING_DESCRIPTION_SECTIONS = [
	{ key: "rationale", label: "Why" },
	{ key: "approach", label: "How" },
	{ key: "tradeoffs", label: "Tradeoffs" }
] as const;
