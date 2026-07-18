import type {
	ParsedProgressionChord,
	SubProgressionMatch
} from "../../../../chord-processing/types.js";
import {
	simplifySuffix,
	MAJOR,
	MINOR,
	DOM7,
	DIM,
	AUG
} from "../../../../chord-processing/chord-classifier/fuzzySuffixMap.js";

// The span of original chord positions that a single collapsed chord represents.
// Collapsing only merges *adjacent* chords, so a group is always contiguous.
export type OriginalRange = { start: number; length: number };

export type CollapsedProgression = {
	chords: ParsedProgressionChord[];
	originalRanges: OriginalRange[];
};

const BASE_TRIAD_MAJOR = "major";
const BASE_TRIAD_MINOR = "minor";
const BASE_TRIAD_DIMINISHED = "diminished";
const BASE_TRIAD_AUGMENTED = "augmented";

// Every voicing collapses onto its underlying triad quality, so extensions,
// added tones, and suspensions all fall away for matching: Isus2, I7, Imaj7,
// and Iadd9 are all just "I". Dominant 7ths fold to major (V7 → V).
const BASE_TRIAD_BY_FUZZY_QUALITY: Readonly<Record<string, string>> = {
	[MAJOR]: BASE_TRIAD_MAJOR,
	[MINOR]: BASE_TRIAD_MINOR,
	[DOM7]: BASE_TRIAD_MAJOR,
	[DIM]: BASE_TRIAD_DIMINISHED,
	[AUG]: BASE_TRIAD_AUGMENTED
};

export const toBaseTriadSuffix = (suffix: string): string => {
	const fuzzyQuality = simplifySuffix(suffix);
	return BASE_TRIAD_BY_FUZZY_QUALITY[fuzzyQuality] ?? fuzzyQuality;
};

// A chord as the matcher sees it: slash bass dropped and the voicing reduced to
// its base triad (Vsus4 → V, vi7 → vi), so only root + harmonic function remain.
export const toCanonicalMatchingChord = (
	chord: ParsedProgressionChord
): ParsedProgressionChord => {
	const { bassPitchClass: _bass, ...rest } = chord;
	return {
		...rest,
		suffix: toBaseTriadSuffix(chord.suffix)
	} as ParsedProgressionChord;
};

const canonicalChordsEqual = (
	a: ParsedProgressionChord,
	b: ParsedProgressionChord
): boolean => a.rootPitchClass === b.rootPitchClass && a.suffix === b.suffix;

// Canonicalizes chords and merges runs of adjacent chords that are identical once
// extensions and slash bass are ignored (e.g. I·Isus2·V·Vsus4 → I·V), while
// remembering which original positions each merged chord spans.
export const collapseAdjacentCanonical = (
	chords: ParsedProgressionChord[]
): CollapsedProgression => {
	const canonicalChords = chords.map(toCanonicalMatchingChord);
	const groupStartIndices = canonicalChords
		.map((_, index) => index)
		.filter(
			(index) =>
				index === 0 ||
				!canonicalChordsEqual(
					canonicalChords[index],
					canonicalChords[index - 1]
				)
		);

	return {
		chords: groupStartIndices.map((index) => canonicalChords[index]),
		originalRanges: groupStartIndices.map((start, groupIndex) => {
			const nextStart =
				groupStartIndices[groupIndex + 1] ?? canonicalChords.length;
			return { start, length: nextStart - start };
		})
	};
};

// Translates a match expressed in collapsed-index space back to the original
// chord positions it covers. Contiguous collapsed groups map to a contiguous
// original span, so the highlight still covers every underlying chord.
export const collapsedMatchToOriginalMatch = (
	match: SubProgressionMatch,
	originalRanges: OriginalRange[]
): SubProgressionMatch => {
	const firstGroup = originalRanges[match.start];
	const lastGroup = originalRanges[match.start + match.length - 1];
	return {
		start: firstGroup.start,
		length: lastGroup.start + lastGroup.length - firstGroup.start
	};
};
