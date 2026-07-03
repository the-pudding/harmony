import type { ChordHighlightPalette } from "../progression-matching-logic/progressionMatchAnalysis.js";

export type { ChordHighlightPalette };

export const CORE_PROGRESSION_PALETTE: ChordHighlightPalette = {
	fill: "#15803d",
	border: "rgba(134, 239, 172, 0.85)"
};

export const DEFAULT_PROGRESSION_PALETTE: ChordHighlightPalette = {
	fill: "#4338ca",
	border: "rgba(99, 102, 241, 0.55)"
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
