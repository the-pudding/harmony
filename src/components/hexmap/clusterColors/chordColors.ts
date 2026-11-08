import {
	paletteById,
	styleOf,
	type ChordPalette
} from "$routes/demo/design/chord-viz/chordPalettes.js";
import type { KeyTonality } from "$routes/demo/design/chord-viz/diatonicChords.js";
import { hexToOklch, oklchToHex } from "./oklab.js";

// Where chord colors come from: a chord (its key and normalized roman
// numeral, see normalizeRoman) to its base color, or null when there's no
// color for it. Strategies only ever pick among chords that have a color,
// so a fuller source changes the map with no other code changes.
export type ChordColorSource = (
	tonality: KeyTonality,
	roman: string
) => string | null;

// A source over one of the chord-viz palettes, which so far list only the
// diatonic chords of each key (no IV in a minor key, no bII or bVII, ...).
export const paletteChordColors =
	(palette: ChordPalette): ChordColorSource =>
	(tonality, roman) =>
		styleOf(palette, tonality, roman)?.colors.fill ?? null;

// The chord palette Chord.svelte draws with, so a cluster's color matches
// the chords shown for it elsewhere in the story.
export const CLUSTER_CHORD_PALETTE: ChordPalette =
	paletteById("journey-from-home");

// TODO: when there's a color for every chord (borrowed and chromatic ones
// included), make this a source over that list. Chords the palette lacks
// today, like the minor-key IV in "i-IV-i", then start counting as
// signature chords instead of being skipped.
export const CLUSTER_CHORD_COLORS: ChordColorSource = paletteChordColors(
	CLUSTER_CHORD_PALETTE
);

// Journey from Home's minor-key colors are dark slate blues that vanish on
// the map's near-black background. Minor chord colors are raised to at
// least this lightness and their chroma scaled up (capped), keeping hue.
export type MinorLift = {
	minLightness: number;
	chromaScale: number;
	maxChroma: number;
};

export const DEFAULT_MINOR_LIFT: MinorLift = {
	minLightness: 0.68,
	chromaScale: 1.8,
	maxChroma: 0.16
};

// One spelling per chord before color lookup and rarity counting: flats in
// a minor key are its own diatonic chords (bVII is VII), and a minor key's
// supertonic is diminished. Other chords pass through unchanged, so a
// source can name them however its list does.
export const normalizeRoman = (
	roman: string,
	tonality: KeyTonality
): string => {
	if (tonality === "major") return roman;
	const natural = roman.replace(/^b/, "");
	return natural === "ii" ? "ii°" : natural;
};

const liftMinor = (hex: string, lift: MinorLift): string => {
	const [l, c, h] = hexToOklch(hex);
	return oklchToHex([
		Math.max(l, lift.minLightness),
		Math.min(lift.maxChroma, c * lift.chromaScale),
		h
	]);
};

export type ChordColorOptions = {
	source?: ChordColorSource;
	// null draws minor chords at their source colors.
	minorLift?: MinorLift | null;
};

// A chord's map color, or null when the source has none for it.
export const chordColor = (
	tonality: KeyTonality,
	roman: string,
	{
		source = CLUSTER_CHORD_COLORS,
		minorLift = DEFAULT_MINOR_LIFT
	}: ChordColorOptions = {}
): string | null => {
	const fill = source(tonality, normalizeRoman(roman, tonality));
	if (!fill) return null;
	return tonality === "minor" && minorLift ? liftMinor(fill, minorLift) : fill;
};
