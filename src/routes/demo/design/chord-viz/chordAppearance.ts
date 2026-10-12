import type { ChordShape } from "./chordShapes.js";
import type { MajorColorQuality, MinorColorQuality } from "./chordPalettes.js";

type MajorChordEntry = { shape: ChordShape; color: MajorColorQuality };
type MinorChordEntry = { shape: ChordShape; color: MinorColorQuality };

export type ChordAppearanceSpec = {
	major: Record<string, MajorChordEntry>;
	minor: Record<string, MinorChordEntry>;
};

export const CHORD_APPEARANCE: ChordAppearanceSpec = {
	major: {
		I: { shape: "stableTriangle", color: "home" },
		ii: { shape: "semiStableTriangle", color: "shadowed" },
		iii: { shape: "circleish", color: "shadowed" },
		IV: { shape: "semiStableTriangle", color: "nearHome" },
		V: { shape: "unstableTriangle", color: "brightFar" },
		vi: { shape: "circleish", color: "shadowed" },
		"vii°": { shape: "spikey", color: "tense" }
	},
	minor: {
		i: { shape: "stableTriangle", color: "home" },
		"ii°": { shape: "spikey", color: "tense" },
		III: { shape: "circleish", color: "majorButDark" },
		iv: { shape: "semiStableTriangle", color: "nearHome" },
		v: { shape: "unstableTriangle", color: "dark" },
		V: { shape: "unstableTriangle", color: "dark" },
		VI: { shape: "circleish", color: "majorButDark" },
		VII: { shape: "semiStableTriangle", color: "majorButDark" }
	}
};
