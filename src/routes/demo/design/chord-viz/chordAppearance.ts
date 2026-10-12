import type { ChordShape } from "./chordShapes.js";
import {
	majorColor,
	minorColor,
	type PaletteColorRef
} from "./chordPalettes.js";
import type { KeyTonality } from "./diatonicChords.js";

type ChordEntry = { shape: ChordShape; color: PaletteColorRef };

export type ChordAppearanceSpec = Record<
	KeyTonality,
	Record<string, ChordEntry>
>;

export const CHORD_APPEARANCE: ChordAppearanceSpec = {
	major: {
		I: { shape: "stableTriangle", color: majorColor("home") },
		ii: { shape: "semiStableTriangle", color: minorColor("nearHome") },
		iii: { shape: "circleish", color: minorColor("dark") },
		IV: { shape: "semiStableTriangle", color: majorColor("nearHome") },
		V: { shape: "unstableTriangle", color: majorColor("brightFar") },
		vi: { shape: "circleish", color: minorColor("home") },
		"vii°": { shape: "spikey", color: minorColor("tense") }
	},
	minor: {
		i: { shape: "stableTriangle", color: minorColor("home") },
		"ii°": { shape: "spikey", color: minorColor("tense") },
		III: { shape: "circleish", color: minorColor("majorButDark") },
		iv: { shape: "semiStableTriangle", color: minorColor("nearHome") },
		v: { shape: "unstableTriangle", color: minorColor("dark") },
		V: { shape: "unstableTriangle", color: minorColor("dark") },
		VI: { shape: "circleish", color: minorColor("majorButDark") },
		VII: { shape: "semiStableTriangle", color: minorColor("majorButDark") }
	}
};
