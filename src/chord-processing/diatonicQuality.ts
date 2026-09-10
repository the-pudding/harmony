import { parseRomanToken } from "./romanNumerals.js";
import { SCALE_INTERVALS, type ScaleName } from "./scale-intervals.js";

type TriadQuality = "maj" | "min" | "dim" | "aug";

const qualityFromThirdFifth = (
	thirdInterval: number,
	fifthInterval: number
): TriadQuality => {
	if (thirdInterval === 4 && fifthInterval === 7) return "maj";
	if (thirdInterval === 3 && fifthInterval === 7) return "min";
	if (thirdInterval === 3 && fifthInterval === 6) return "dim";
	if (thirdInterval === 4 && fifthInterval === 8) return "aug";
	// Exotic scale degrees (e.g. locrian's I, phrygian dominant's ii) can
	// stack thirds that aren't a clean major/minor/dim/aug triad — fall back
	// to classifying by the third alone.
	return thirdInterval === 4 ? "maj" : "min";
};

// The diatonic (in-scale) triad quality for a given scale degree, derived by
// stacking thirds within the scale itself — e.g. major's ii is minor because
// stacking two more scale-steps on top of its root produces a minor third
// and a perfect fifth.
export const diatonicQualityForDegree = (
	scale: ScaleName,
	degree1Based: number
): TriadQuality => {
	const intervals = SCALE_INTERVALS[scale];
	const i = degree1Based - 1;
	const root = intervals[i];
	const third = intervals[(i + 2) % 7] + (i + 2 >= 7 ? 12 : 0);
	const fifth = intervals[(i + 4) % 7] + (i + 4 >= 7 ? 12 : 0);
	return qualityFromThirdFifth(third - root, fifth - root);
};

// A chord is non-diatonic (borrowed/chromatic) when its root is altered by
// an explicit accidental (bVII, #IV), or when its quality doesn't match
// what's diatonic for its degree in the given scale (e.g. a minor iv or
// major III in a major-key section). This catches real modal-mixture moves
// that a flat/sharp-only check would miss — most pop "borrowed" chords
// (minor iv, minor v, major III, major VII) never carry an explicit
// accidental in this corpus; they're written as a plain degree number with
// the "wrong" case for their scale.
export const isNonDiatonicToken = (token: string, scale: ScaleName): boolean => {
	const parsed = parseRomanToken(token);
	if (!parsed) return false;
	if (parsed.flat || parsed.sharp) return true;
	return parsed.quality !== diatonicQualityForDegree(scale, parsed.degree);
};
