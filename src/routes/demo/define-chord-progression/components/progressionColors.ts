import type {
	ChordHighlightPalette,
	ProgressionWithMatchStats
} from "../progression-matching-logic/progressionMatchAnalysis.js";

export type { ChordHighlightPalette };

export const CORE_PROGRESSION_PALETTE: ChordHighlightPalette = {
	fill: "#15803d",
	border: "rgba(134, 239, 172, 0.85)"
};

export const DEFAULT_PROGRESSION_PALETTE: ChordHighlightPalette = {
	fill: "#4338ca",
	border: "rgba(99, 102, 241, 0.55)"
};

export const DIM_MATCH_COLOR = "rgb(113, 113, 122)";

export const NON_SELECTED_PROGRESSION_PALETTE: ChordHighlightPalette = {
	fill: "#3f3f46",
	border: DIM_MATCH_COLOR
};

export const matchHighlightForCoreProgression = (
	isCoreProgression: boolean
): {
	isCoreProgression: boolean;
	highlightPalette: ChordHighlightPalette;
} => ({
	isCoreProgression,
	highlightPalette: isCoreProgression
		? CORE_PROGRESSION_PALETTE
		: DEFAULT_PROGRESSION_PALETTE
});

export type MatchOutline = {
	color: string | undefined;
	dashed: boolean;
};

export const matchOutline = (
	match: Pick<
		ProgressionWithMatchStats,
		"isCoreProgression" | "isStrictSubset" | "highlightPalette"
	>
): MatchOutline => ({
	dashed: !!match.isStrictSubset,
	color:
		match.isStrictSubset || match.isCoreProgression
			? match.highlightPalette.border
			: undefined
});
