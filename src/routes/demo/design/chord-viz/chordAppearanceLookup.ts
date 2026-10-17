import {
	DEFAULT_PALETTE,
	styleOf,
	type ChordColors,
	type ChordPalette,
	type ChordStyle
} from "./chordPalettes.js";
import { CHORD_SHAPE_PATHS, type ChordShape } from "./chordShapes.js";
import type { KeyTonality } from "./diatonicChords.js";

export type ChordAppearance = {
	shape: ChordShape;
	path: string;
	colors: ChordColors;
};

const FALLBACK_STYLE: Record<KeyTonality, ChordStyle> = {
	major: DEFAULT_PALETTE["major.I"],
	minor: DEFAULT_PALETTE["minor.i"]
};

export const appearanceFor = (
	tonality: KeyTonality,
	roman: string,
	palette: ChordPalette = DEFAULT_PALETTE
): ChordAppearance => {
	const style = styleOf(palette, tonality, roman) ?? FALLBACK_STYLE[tonality];
	return {
		shape: style.shape,
		path: CHORD_SHAPE_PATHS[style.shape],
		colors: style.colors
	};
};
