import { diatonicQualityForDegree } from "./diatonicQuality.js";
import { hasDistinctBass } from "./chord-classifier/index.js";
import {
	NOTE_NAMES,
	NOTES_PER_OCTAVE,
	noteNameToPitchClass
} from "./chord-classifier/notes.js";
import { formatParsedRomanToken } from "./romanNumerals.js";
import { SCALE_INTERVALS, type ScaleName } from "./scale-intervals.js";
import type { StructuredChord } from "./types.js";

export type MusicalKey = {
	tonic: string;
	scale: ScaleName;
};

type ScaleDegree = { degree: number; flat: boolean; sharp: boolean };

const offsetFromTonic = (pitchClass: number, key: MusicalKey): number =>
	(pitchClass - noteNameToPitchClass(key.tonic) + NOTES_PER_OCTAVE) %
	NOTES_PER_OCTAVE;

// The scale degree a pitch class sits on, or the degree it's a flat (or,
// failing that, a sharp) of when it's outside the scale.
const scaleDegreeOf = (pitchClass: number, key: MusicalKey): ScaleDegree => {
	const intervals = SCALE_INTERVALS[key.scale];
	const offset = offsetFromTonic(pitchClass, key);
	const exact = intervals.indexOf(offset);
	if (exact !== -1) return { degree: exact + 1, flat: false, sharp: false };
	const flatOf = intervals.indexOf((offset + 1) % NOTES_PER_OCTAVE);
	if (flatOf !== -1) return { degree: flatOf + 1, flat: true, sharp: false };
	const sharpOf = intervals.indexOf(
		(offset + NOTES_PER_OCTAVE - 1) % NOTES_PER_OCTAVE
	);
	return { degree: sharpOf + 1, flat: false, sharp: true };
};

const DIMINISHED_SUFFIXES = new Set(["diminished", "dim7"]);

// Matches parseRomanToken: "viim7b5" is a minor numeral with an m7b5 tail.
const romanQualityOf = (suffix: string): string => {
	if (DIMINISHED_SUFFIXES.has(suffix)) return "dim";
	if (suffix === "augmented") return "aug";
	if (suffix.startsWith("minor") || suffix === "m7b5") return "min";
	return "maj";
};

const bassDegreeOf = (chord: StructuredChord, key: MusicalKey) => {
	if (!hasDistinctBass(chord) || chord.bassPitchClass === undefined) return {};
	const bass = scaleDegreeOf(chord.bassPitchClass, key);
	return {
		bassDegree: bass.degree,
		bassFlat: bass.flat,
		bassSharp: bass.sharp
	};
};

export const romanTokenForChord = (
	chord: StructuredChord,
	key: MusicalKey
): string =>
	formatParsedRomanToken({
		...scaleDegreeOf(chord.rootPitchClass, key),
		quality: romanQualityOf(chord.suffix),
		suffix: chord.suffix,
		...bassDegreeOf(chord, key)
	});

const SUFFIX_BY_QUALITY: Record<string, string> = {
	maj: "major",
	min: "minor",
	dim: "diminished",
	aug: "augmented"
};

// The chord that belongs on this bass note in the key, e.g. F# in A major
// is F#m. A note outside the key is taken as a major chord.
export const diatonicChordOnBass = (
	bassPitchClass: number,
	key: MusicalKey
): StructuredChord => {
	const { degree, flat, sharp } = scaleDegreeOf(bassPitchClass, key);
	const quality =
		flat || sharp ? "maj" : diatonicQualityForDegree(key.scale, degree);
	return { rootPitchClass: bassPitchClass, suffix: SUFFIX_BY_QUALITY[quality] };
};

export const KEY_TONICS: string[] = NOTE_NAMES;
