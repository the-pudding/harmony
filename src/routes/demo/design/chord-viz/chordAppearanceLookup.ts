import { CHORD_APPEARANCE } from "./chordAppearance.js";
import {
	DEFAULT_PALETTE,
	colorOf,
	majorColor,
	minorColor,
	type ChordColors,
	type ChordPalette
} from "./chordPalettes.js";
import { CHORD_SHAPE_PATHS } from "./chordShapes.js";
import type { KeyTonality } from "./diatonicChords.js";

export type ChordAppearance = { path: string; colors: ChordColors };

const FALLBACK_SHAPE = "circleish";

const FALLBACK_COLOR = { major: majorColor("home"), minor: minorColor("home") };

export const appearanceFor = (
	tonality: KeyTonality,
	roman: string,
	palette: ChordPalette = DEFAULT_PALETTE
): ChordAppearance => {
	const spec = CHORD_APPEARANCE[tonality][roman] ?? {
		shape: FALLBACK_SHAPE,
		color: FALLBACK_COLOR[tonality]
	};
	return {
		path: CHORD_SHAPE_PATHS[spec.shape],
		colors: colorOf(palette, spec.color)
	};
};
