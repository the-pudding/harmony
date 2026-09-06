import {
	colorForProgressionGroupName,
	UNGROUPED_PROGRESSION_GROUP_COLOR
} from "$data/core-progressions.js";
import { progressionGroupNameFor } from "$data/core-progressions.util.js";
import type {
	ChordHighlightPalette,
	ProgressionWithMatchStats
} from "../progression-matching-logic/progressionMatchAnalysis.js";

export type { ChordHighlightPalette };

const HIGHLIGHT_FILL_GROUP_COLOR_PERCENT = 55;
export const PALETTE_FILL_HOVER_COLOR_PERCENT = 80;

export const highlightPaletteFromColor = (
	color: string
): ChordHighlightPalette => ({
	fill: `color-mix(in srgb, ${color} ${HIGHLIGHT_FILL_GROUP_COLOR_PERCENT}%, black)`,
	border: color
});

export const highlightPaletteForProgression = (
	chordProgression: string,
	progressionName?: string
): ChordHighlightPalette =>
	highlightPaletteFromColor(
		colorForProgressionGroupName(
			progressionGroupNameFor(chordProgression, progressionName)
		)
	);

export const UNGROUPED_PROGRESSION_PALETTE: ChordHighlightPalette =
	highlightPaletteFromColor(UNGROUPED_PROGRESSION_GROUP_COLOR);

const NON_CORE_PROGRESSION_COLORS = [
	"#7a658c",
	"#3d3550",
	"#8a5f96",
	"#555a72",
	"#6e4e5c"
] as const;

export const colorForNonCoreProgression = (index: number): string =>
	NON_CORE_PROGRESSION_COLORS[index % NON_CORE_PROGRESSION_COLORS.length] ??
	UNGROUPED_PROGRESSION_GROUP_COLOR;

export const DIM_MATCH_COLOR = "rgb(113, 113, 122)";

export const NON_SELECTED_PROGRESSION_PALETTE: ChordHighlightPalette = {
	fill: "#3f3f46",
	border: DIM_MATCH_COLOR
};

export const matchHighlightForCoreProgression = (
	isCoreProgression: boolean,
	chordProgression: string,
	progressionName?: string
): {
	isCoreProgression: boolean;
	highlightPalette: ChordHighlightPalette;
} => ({
	isCoreProgression,
	highlightPalette: highlightPaletteForProgression(
		chordProgression,
		progressionName
	)
});

export type MatchOutline = {
	color: string | undefined;
	dashed: boolean;
};

export const matchOutline = (
	match: Pick<ProgressionWithMatchStats, "isStrictSubset" | "highlightPalette">
): MatchOutline => ({
	dashed: !!match.isStrictSubset,
	color: match.highlightPalette.border
});
