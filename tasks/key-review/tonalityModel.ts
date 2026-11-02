import {
	NOTES_PER_OCTAVE,
	pitchClass
} from "../../src/chord-processing/chord-classifier/notes.js";
import { toPitchClass } from "./pitchClasses.js";
import { SCALE_INTERVALS } from "../../src/chord-processing/scale-intervals.js";
import type { SongInput } from "../../src/chord-processing/types.js";

export type AbsoluteChord = { rootPc: number; isMinor: boolean };
export type Tonality = { tonicPc: number; scale: string };
export type ScoredTonality = Tonality & { score: number };
export type TrainingSection = { chords: AbsoluteChord[]; tonality: Tonality };
export type TrustedSong = { sections: TrainingSection[]; primary: Tonality };

export type TonalityModel = {
	modes: string[];
	logChordProbabilities: Record<string, number[]>;
	logModePriors: Record<string, number>;
};

export const COMMON_MODE_MIN_SHARE = 0.03;
export const TONIC_CUE_WEIGHT = 1;
export const MODE_PRIOR_WEIGHT = 0.3;
const CHORD_COUNT_SMOOTHING = 1;
const CHORD_QUALITY_COUNT = 2;
const CHORD_FEATURE_COUNT = NOTES_PER_OCTAVE * CHORD_QUALITY_COUNT;
const MINOR_THIRD = 3;
const THIRD_DEGREE_INDEX = 2;
const MINOR_LIKE_SUFFIXES = new Set([
	"minor",
	"minor7",
	"minor9",
	"m7b5",
	"diminished",
	"dim7"
]);

export const isMinorSuffix = (suffix: string): boolean =>
	MINOR_LIKE_SUFFIXES.has(suffix);

export const sectionChords = (section: SongInput): AbsoluteChord[] =>
	section.progression.map((chord) => ({
		rootPc: toPitchClass(chord.noteName),
		isMinor: isMinorSuffix(chord.suffix)
	}));

export const isMinorMode = (scale: string): boolean =>
	SCALE_INTERVALS[scale]?.[THIRD_DEGREE_INDEX] === MINOR_THIRD;

const chordFeatureIndex = (chord: AbsoluteChord, tonicPc: number): number =>
	pitchClass(chord.rootPc - tonicPc) * CHORD_QUALITY_COUNT +
	(chord.isMinor ? 1 : 0);

const countBy = <T>(items: T[], keyOf: (item: T) => string) =>
	items.reduce<Record<string, number>>(
		(counts, item) => ({
			...counts,
			[keyOf(item)]: (counts[keyOf(item)] ?? 0) + 1
		}),
		{}
	);

export const computeCommonModes = (songs: TrustedSong[]): string[] => {
	const modeCounts = countBy(songs, (song) => song.primary.scale);
	return Object.entries(modeCounts)
		.filter(([, count]) => count / songs.length >= COMMON_MODE_MIN_SHARE)
		.sort((a, b) => b[1] - a[1])
		.map(([mode]) => mode);
};

const featureCountsForMode = (
	sections: TrainingSection[],
	mode: string
): number[] =>
	sections
		.filter((section) => section.tonality.scale === mode)
		.flatMap((section) =>
			section.chords.map((chord) =>
				chordFeatureIndex(chord, section.tonality.tonicPc)
			)
		)
		.reduce(
			(counts, index) =>
				counts.map((count, i) => (i === index ? count + 1 : count)),
			Array.from({ length: CHORD_FEATURE_COUNT }, () => CHORD_COUNT_SMOOTHING)
		);

const toLogProbabilities = (counts: number[]): number[] => {
	const total = counts.reduce((sum, count) => sum + count, 0);
	return counts.map((count) => Math.log(count / total));
};

export const trainTonalityModel = (songs: TrustedSong[]): TonalityModel => {
	const modes = computeCommonModes(songs);
	const commonSongs = songs.filter((song) =>
		modes.includes(song.primary.scale)
	);
	const sections = commonSongs.flatMap((song) => song.sections);
	const modeCounts = countBy(commonSongs, (song) => song.primary.scale);

	return {
		modes,
		logChordProbabilities: Object.fromEntries(
			modes.map((mode) => [
				mode,
				toLogProbabilities(featureCountsForMode(sections, mode))
			])
		),
		logModePriors: Object.fromEntries(
			modes.map((mode) => [
				mode,
				Math.log(modeCounts[mode] / commonSongs.length)
			])
		)
	};
};

const isTonicChord = (chord: AbsoluteChord, tonality: Tonality): boolean =>
	chord.rootPc === tonality.tonicPc &&
	chord.isMinor === isMinorMode(tonality.scale);

const sectionBoundaryChords = (sections: AbsoluteChord[][]): AbsoluteChord[] =>
	sections.flatMap((chords) => [chords[0], chords[chords.length - 1]]);

export const tonicCueShare = (
	sections: AbsoluteChord[][],
	tonality: Tonality
): number => {
	const boundaries = sectionBoundaryChords(sections);
	return (
		boundaries.filter((chord) => isTonicChord(chord, tonality)).length /
		boundaries.length
	);
};

export const scoreTonality = (
	model: TonalityModel,
	sections: AbsoluteChord[][],
	tonality: Tonality
): number => {
	const logProbabilities = model.logChordProbabilities[tonality.scale];
	if (!logProbabilities) return Number.NEGATIVE_INFINITY;

	const chords = sections.flat();
	const meanLogLikelihood =
		chords.reduce(
			(sum, chord) =>
				sum + logProbabilities[chordFeatureIndex(chord, tonality.tonicPc)],
			0
		) / chords.length;

	return (
		meanLogLikelihood +
		TONIC_CUE_WEIGHT * tonicCueShare(sections, tonality) +
		MODE_PRIOR_WEIGHT * model.logModePriors[tonality.scale]
	);
};

const ALL_TONIC_PITCH_CLASSES = Array.from(
	{ length: NOTES_PER_OCTAVE },
	(_, pc) => pc
);

export const rankTonalities = (
	model: TonalityModel,
	sections: AbsoluteChord[][]
): ScoredTonality[] =>
	ALL_TONIC_PITCH_CLASSES.flatMap((tonicPc) =>
		model.modes.map((scale) => ({
			tonicPc,
			scale,
			score: scoreTonality(model, sections, { tonicPc, scale })
		}))
	).sort((a, b) => b.score - a.score);

export const tonalityOf = (key: string, scale: string): Tonality => ({
	tonicPc: toPitchClass(key),
	scale
});

export const outOfKeyShare = (
	sections: AbsoluteChord[][],
	tonality: Tonality
): number => {
	const intervals = SCALE_INTERVALS[tonality.scale] ?? [];
	const chords = sections.flat();
	return (
		chords.filter(
			(chord) =>
				!intervals.includes(pitchClass(chord.rootPc - tonality.tonicPc))
		).length / chords.length
	);
};
