import type { ChordShape } from "./chordShapes.js";
import {
	CHORD_VIZ_ROWS,
	chordIdOf,
	type ChordId,
	type KeyTonality
} from "./diatonicChords.js";

export type ChordColors = { fill: string; text: string };

export type ChordStyle = {
	shape: ChordShape;
	colors: ChordColors;
};

export type ChordPalette = Record<ChordId, ChordStyle>;

export type NamedChordPalette = {
	id: string;
	label: string;
	palette: ChordPalette;
};

type MajorRoman = "I" | "ii" | "iii" | "IV" | "V" | "vi" | "vii°";
type MinorRoman = "i" | "ii°" | "III" | "iv" | "v" | "VI" | "VII";

type PaletteDraft = {
	major: Record<MajorRoman, ChordStyle>;
	minor: Record<MinorRoman, ChordStyle> & { V?: ChordStyle };
};

const LIGHT = "#f8fafc";
const DARK = "#0f172a";

const style = (
	shape: ChordShape,
	fill: string,
	text: string = LIGHT
): ChordStyle => ({ shape, colors: { fill, text } });

const paletteFrom = ({ major, minor }: PaletteDraft): ChordPalette =>
	Object.fromEntries([
		...Object.entries(major).map(([roman, chordStyle]) => [
			chordIdOf("major", roman),
			chordStyle
		]),
		...Object.entries(minor).map(([roman, chordStyle]) => [
			chordIdOf("minor", roman),
			chordStyle
		])
	]) as ChordPalette;

const STABLE = "stableTriangle" as const;
const SEMI = "semiStableTriangle" as const;
const UNSTABLE = "unstableTriangle" as const;
const CIRCLE = "circleish" as const;
const SPIKE = "spikey" as const;

const DEFAULT_PALETTE_DRAFT: PaletteDraft = {
	major: {
		I: style(STABLE, "#2563a8"),
		ii: style(SEMI, "#8b45c0"),
		iii: style(CIRCLE, "#2d1050"),
		IV: style(SEMI, "#4a90c4"),
		V: style(UNSTABLE, "#38bdf8", DARK),
		vi: style(CIRCLE, "#5b2a8a"),
		"vii°": style(SPIKE, "#6b4f7c")
	},
	minor: {
		i: style(STABLE, "#5b2a8a"),
		"ii°": style(SPIKE, "#6b4f7c"),
		III: style(CIRCLE, "#1e3a78"),
		iv: style(SEMI, "#8b45c0"),
		v: style(UNSTABLE, "#2d1050"),
		V: style(UNSTABLE, "#2d1050"),
		VI: style(CIRCLE, "#1e3a78"),
		VII: style(SEMI, "#1e3a78")
	}
};

const HARMONIC_FUNCTION_DRAFT: PaletteDraft = {
	major: {
		I: style(STABLE, "#e24a3b"),
		iii: style(CIRCLE, "#c45c5c"),
		vi: style(CIRCLE, "#a83c48"),
		ii: style(SEMI, "#d4a84a", DARK),
		IV: style(SEMI, "#e8b84a", DARK),
		V: style(UNSTABLE, "#f07828", DARK),
		"vii°": style(SPIKE, "#d46020")
	},
	minor: {
		i: style(STABLE, "#8b2f45"),
		III: style(CIRCLE, "#6b3a55"),
		VI: style(CIRCLE, "#5a3048"),
		"ii°": style(SPIKE, "#6e5c38"),
		iv: style(SEMI, "#8a7340"),
		v: style(UNSTABLE, "#a05040"),
		V: style(UNSTABLE, "#b85838"),
		VII: style(SEMI, "#8a4840")
	}
};

const JOURNEY_FROM_HOME_DRAFT: PaletteDraft = {
	major: {
		I: style(STABLE, "#f0c040", DARK),
		IV: style(SEMI, "#e8a848", DARK),
		vi: style(CIRCLE, "#c07050"),
		ii: style(SEMI, "#e08840", DARK),
		iii: style(CIRCLE, "#d07060"),
		V: style(UNSTABLE, "#ff6030", DARK),
		"vii°": style(SPIKE, "#e04050")
	},
	minor: {
		i: style(STABLE, "#3a5a7a"),
		iv: style(SEMI, "#4a6a6a"),
		VI: style(CIRCLE, "#4a5070"),
		III: style(CIRCLE, "#5a4a68"),
		v: style(UNSTABLE, "#3a4a5a"),
		VII: style(SEMI, "#2a4058"),
		"ii°": style(SPIKE, "#1e3048"),
		V: style(UNSTABLE, "#4a5568")
	}
};

export const DEFAULT_PALETTE = paletteFrom(DEFAULT_PALETTE_DRAFT);

export const CHORD_PALETTES: NamedChordPalette[] = [
	{ id: "default", label: "Default", palette: DEFAULT_PALETTE },
	{
		id: "harmonic-function",
		label: "Harmonic function",
		palette: paletteFrom(HARMONIC_FUNCTION_DRAFT)
	},
	{
		id: "journey-from-home",
		label: "Journey from Home",
		palette: paletteFrom(JOURNEY_FROM_HOME_DRAFT)
	}
];

export const DEFAULT_PALETTE_ID = CHORD_PALETTES[0].id;

export const DIATONIC_CHORD_IDS: ChordId[] = CHORD_VIZ_ROWS.flatMap((row) =>
	row.chords.map((chord) => chordIdOf(row.tonality, chord.roman))
);

export const paletteById = (id: string): ChordPalette =>
	(CHORD_PALETTES.find((entry) => entry.id === id) ?? CHORD_PALETTES[0])
		.palette;

export const styleOf = (
	palette: ChordPalette,
	tonality: KeyTonality,
	roman: string
): ChordStyle | undefined => palette[chordIdOf(tonality, roman)];
