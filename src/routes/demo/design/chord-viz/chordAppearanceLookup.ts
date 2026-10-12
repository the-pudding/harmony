import { CHORD_APPEARANCE } from "./chordAppearance.js";
import { DEFAULT_PALETTE, type ChordColors, type ChordPalette } from "./chordPalettes.js";
import { CHORD_SHAPE_PATHS } from "./chordShapes.js";
import type { KeyTonality } from "./diatonicChords.js";

export type ChordAppearance = { path: string; colors: ChordColors };

const FALLBACK_SHAPE = "circleish";

const fallbackAppearanceFor = (tonality: KeyTonality, palette: ChordPalette): ChordAppearance => ({
	path: CHORD_SHAPE_PATHS[FALLBACK_SHAPE],
	colors: tonality === "major" ? palette.major.home : palette.minor.home
});

const resolveColors = (
	tonality: KeyTonality,
	color: string,
	palette: ChordPalette
): ChordColors => {
	if (tonality === "major") {
		return palette.major[color as keyof typeof palette.major] ?? palette.major.home;
	}
	return palette.minor[color as keyof typeof palette.minor] ?? palette.minor.home;
};

export const appearanceFor = (
	tonality: KeyTonality,
	roman: string,
	palette: ChordPalette = DEFAULT_PALETTE
): ChordAppearance => {
	const spec = CHORD_APPEARANCE[tonality][roman];
	if (!spec) return fallbackAppearanceFor(tonality, palette);
	return {
		path: CHORD_SHAPE_PATHS[spec.shape],
		colors: resolveColors(tonality, spec.color, palette)
	};
};
