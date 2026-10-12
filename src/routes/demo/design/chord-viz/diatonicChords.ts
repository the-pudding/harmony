import { diatonicQualityForDegree } from "../../../../chord-processing/diatonicQuality.js";
import { degreeQualityToRoman } from "../../../../chord-processing/romanNumerals.js";
import {
	SCALE_INTERVALS,
	type ScaleName
} from "../../../../chord-processing/scale-intervals.js";

export type ChordTone = "major" | "minor";

export type DiatonicChord = {
	degree: number;
	roman: string;
	tone: ChordTone;
};

export type VizChord = DiatonicChord & { seed: number };

export type ChordVizRow = {
	scale: ScaleName;
	label: string;
	chords: VizChord[];
};

const MAJOR_TONE_QUALITIES = new Set(["maj", "aug"]);

const toneOfQuality = (quality: string): ChordTone =>
	MAJOR_TONE_QUALITIES.has(quality) ? "major" : "minor";

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

const CHORD_VIZ_SCALES: { scale: ScaleName; label: string }[] = [
	{ scale: "major", label: "Major" },
	{ scale: "minor", label: "Minor" }
];

export const CHORD_VIZ_ROWS: ChordVizRow[] = CHORD_VIZ_SCALES.map(
	({ scale, label }, rowIndex) => {
		const chords = diatonicChordsOf(scale);
		return {
			scale,
			label,
			chords: chords.map((chord, chordIndex) => ({
				...chord,
				seed: rowIndex * chords.length + chordIndex
			}))
		};
	}
);
