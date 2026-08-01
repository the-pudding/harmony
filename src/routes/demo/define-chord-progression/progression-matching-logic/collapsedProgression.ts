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
import { bassIntervalFromRoot } from "../../../../chord-processing/chord-classifier/index.js";
import { NOTES_PER_OCTAVE } from "../../../../chord-processing/chord-classifier/notes.js";

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

const BASE_TRIAD_SUFFIXES = new Set([
	BASE_TRIAD_MAJOR,
	BASE_TRIAD_MINOR,
	BASE_TRIAD_DIMINISHED,
	BASE_TRIAD_AUGMENTED
]);

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

// A chord as the matcher sees it under fully liberal rules: slash bass dropped
// and the voicing reduced to its base triad (Vsus4 → V, vi7 → vi).
export const toCanonicalMatchingChord = (
	chord: ParsedProgressionChord
): ParsedProgressionChord => {
	const { bassPitchClass: _bass, ...rest } = chord;
	return {
		...rest,
		suffix: toBaseTriadSuffix(chord.suffix)
	} as ParsedProgressionChord;
};

// Bare triad with no slash bass → match liberally (ignore song extensions/bass).
// Any specified extension or slash bass → require that detail exactly.
export const isLiberalMatchingChord = (
	chord: ParsedProgressionChord
): boolean =>
	BASE_TRIAD_SUFFIXES.has(chord.suffix) && chord.bassPitchClass === undefined;

export type MatchingTemplate = {
	chord: ParsedProgressionChord;
	mode: "liberal" | "exact";
};

export const toMatchingTemplate = (
	chord: ParsedProgressionChord
): MatchingTemplate =>
	isLiberalMatchingChord(chord)
		? { chord: toCanonicalMatchingChord(chord), mode: "liberal" }
		: {
				chord: {
					rootPitchClass: chord.rootPitchClass,
					suffix: chord.suffix,
					display: chord.display,
					...(chord.bassPitchClass !== undefined
						? { bassPitchClass: chord.bassPitchClass }
						: {})
				},
				mode: "exact"
			};

const templatesEqual = (a: MatchingTemplate, b: MatchingTemplate): boolean =>
	a.mode === b.mode &&
	a.chord.rootPitchClass === b.chord.rootPitchClass &&
	a.chord.suffix === b.chord.suffix &&
	a.chord.bassPitchClass === b.chord.bassPitchClass;

// Collapse adjacent identical search templates (two bare I's merge; I then Imaj7
// stay distinct because Imaj7 is exact).
export const collapseMatchingTemplates = (
	chords: ParsedProgressionChord[]
): MatchingTemplate[] => {
	const templates = chords.map(toMatchingTemplate);
	return templates.filter(
		(template, index) =>
			index === 0 || !templatesEqual(template, templates[index - 1])
	);
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

const intervalBetweenRoots = (
	fromRootPitchClass: number,
	toRootPitchClass: number
): number =>
	(toRootPitchClass - fromRootPitchClass + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE;

const templateDeltas = (templates: MatchingTemplate[]): number[] =>
	templates
		.slice(1)
		.map((template, index) =>
			intervalBetweenRoots(
				templates[index].chord.rootPitchClass,
				template.chord.rootPitchClass
			)
		);

const matchesLiberalTemplate = (
	sectionChord: ParsedProgressionChord,
	template: ParsedProgressionChord
): boolean => toBaseTriadSuffix(sectionChord.suffix) === template.suffix;

const matchesExactTemplate = (
	sectionChord: ParsedProgressionChord,
	template: ParsedProgressionChord
): boolean => {
	if (sectionChord.suffix !== template.suffix) return false;
	if (template.bassPitchClass === undefined) return true;
	return bassIntervalFromRoot(sectionChord) === bassIntervalFromRoot(template);
};

const liberalRunLength = (
	section: ParsedProgressionChord[],
	start: number,
	template: ParsedProgressionChord
): number => {
	if (
		start >= section.length ||
		!matchesLiberalTemplate(section[start], template)
	) {
		return 0;
	}
	const remaining = section.slice(start + 1);
	const extra = remaining.findIndex(
		(chord) =>
			!matchesLiberalTemplate(chord, template) ||
			chord.rootPitchClass !== section[start].rootPitchClass
	);
	return extra === -1 ? 1 + remaining.length : 1 + extra;
};

const deltaMatches = (
	prevRoot: number | null,
	nextRoot: number,
	templateIndex: number,
	expectedDeltas: number[]
): boolean => {
	if (prevRoot === null || templateIndex === 0) return true;
	return (
		intervalBetweenRoots(prevRoot, nextRoot) ===
		expectedDeltas[templateIndex - 1]
	);
};

const matchTemplatesFrom = (
	section: ParsedProgressionChord[],
	sectionIndex: number,
	templates: MatchingTemplate[],
	templateIndex: number,
	prevRoot: number | null,
	expectedDeltas: number[]
): number | null => {
	if (templateIndex === templates.length) return sectionIndex;
	if (sectionIndex >= section.length) return null;

	const template = templates[templateIndex];
	const sectionChord = section[sectionIndex];

	if (template.mode === "exact") {
		if (!matchesExactTemplate(sectionChord, template.chord)) return null;
		if (
			!deltaMatches(
				prevRoot,
				sectionChord.rootPitchClass,
				templateIndex,
				expectedDeltas
			)
		) {
			return null;
		}
		return matchTemplatesFrom(
			section,
			sectionIndex + 1,
			templates,
			templateIndex + 1,
			sectionChord.rootPitchClass,
			expectedDeltas
		);
	}

	const maxRun = liberalRunLength(section, sectionIndex, template.chord);
	if (maxRun === 0) return null;
	if (
		!deltaMatches(
			prevRoot,
			sectionChord.rootPitchClass,
			templateIndex,
			expectedDeltas
		)
	) {
		return null;
	}

	const runLengths = Array.from(
		{ length: maxRun },
		(_, offset) => maxRun - offset
	);
	for (const run of runLengths) {
		const end = matchTemplatesFrom(
			section,
			sectionIndex + run,
			templates,
			templateIndex + 1,
			sectionChord.rootPitchClass,
			expectedDeltas
		);
		if (end !== null) return end;
	}
	return null;
};

// Match a search progression against a section using relative (key-independent)
// intervals. Bare triad search chords match any voicing of that function and
// absorb adjacent same-root repeats. Search chords that name an extension or
// slash bass require that detail exactly, so I-Imaj7 stays two chords.
export const matchProgressionSelectiveExactness = (
	sectionProgression: ParsedProgressionChord[],
	searchProgression: ParsedProgressionChord[]
): SubProgressionMatch[] => {
	const templates = collapseMatchingTemplates(searchProgression);
	if (templates.length === 0) return [];
	if (templates.length > sectionProgression.length) return [];

	const expectedDeltas = templateDeltas(templates);
	const lastStart = sectionProgression.length - templates.length;
	return Array.from({ length: lastStart + 1 }, (_, start) => start).flatMap(
		(start) => {
			const end = matchTemplatesFrom(
				sectionProgression,
				start,
				templates,
				0,
				null,
				expectedDeltas
			);
			return end === null ? [] : [{ start, length: end - start }];
		}
	);
};
