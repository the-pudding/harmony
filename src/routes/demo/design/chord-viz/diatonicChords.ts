import { diatonicQualityForDegree } from "../../../../chord-processing/diatonicQuality.js";
import {
	degreeQualityToRoman,
	parseRomanToken
} from "../../../../chord-processing/romanNumerals.js";
import {
	SCALE_INTERVALS,
	type ScaleName
} from "../../../../chord-processing/scale-intervals.js";

export type ChordTone = "major" | "minor";
export type KeyTonality = "major" | "minor";
export type ChordId = `${KeyTonality}.${string}`;

export const chordIdOf = (tonality: KeyTonality, roman: string): ChordId =>
	`${tonality}.${roman}`;

export type DiatonicChord = {
	degree: number;
	roman: string;
	tone: ChordTone;
};

export type VizChord = DiatonicChord & { seed: number; tonality: KeyTonality };

export type ChordVizRow = {
	scale: ScaleName;
	label: string;
	tonality: KeyTonality;
	chords: VizChord[];
};

const MAJOR_TONE_QUALITIES = new Set(["maj", "aug"]);

const toneOfQuality = (quality: string): ChordTone =>
	MAJOR_TONE_QUALITIES.has(quality) ? "major" : "minor";

const FALLBACK_QUALITY = "maj";

export const toneOfRomanToken = (token: string): ChordTone =>
	toneOfQuality(parseRomanToken(token)?.quality ?? FALLBACK_QUALITY);

export const diatonicChordsOf = (scale: ScaleName): DiatonicChord[] =>
	SCALE_INTERVALS[scale].map((_, index) => {
		const degree = index + 1;
		const quality = diatonicQualityForDegree(scale, degree);
		return {
			degree,
			roman: degreeQualityToRoman(degree, quality) ?? "",
			tone: toneOfQuality(quality)
		};
	});

const TONIC_DEGREE = 1;
const MINOR_TONIC_QUALITIES = new Set(["min", "dim"]);

export const tonalityOfScale = (scale: ScaleName): KeyTonality =>
	MINOR_TONIC_QUALITIES.has(diatonicQualityForDegree(scale, TONIC_DEGREE))
		? "minor"
		: "major";

const CHORD_VIZ_SCALES: { scale: ScaleName; label: string }[] = [
	{ scale: "major", label: "Major" },
	{ scale: "minor", label: "Minor" }
];

export const CHORD_VIZ_ROWS: ChordVizRow[] = CHORD_VIZ_SCALES.map(
	({ scale, label }, rowIndex) => {
		const chords = diatonicChordsOf(scale);
		const tonality = tonalityOfScale(scale);
		return {
			scale,
			label,
			tonality,
			chords: chords.map((chord, chordIndex) => ({
				...chord,
				tonality,
				seed: rowIndex * chords.length + chordIndex
			}))
		};
	}
);
