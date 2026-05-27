import { NOTES_PER_OCTAVE, NOTE_NAMES, pitchClass } from "./notes.js";
import { CHORD_TEMPLATES } from "./templates.js";
import type { ChordClassification, ChordTemplate, StructuredChord } from "../types.js";

export const UNKNOWN_CHORD_NAME = "unknown";

const setsEqual = (a: Set<number>, b: Set<number>): boolean => {
	if (a.size !== b.size) return false;
	for (const item of a) if (!b.has(item)) return false;
	return true;
};

const intervalsFromRoot = (rootPitchClass: number, pitchClasses: Set<number>): Set<number> =>
	new Set(
		[...pitchClasses].map(
			(notePitchClass) =>
				(notePitchClass - rootPitchClass + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE
		)
	);

export const hasDistinctBass = ({
	rootPitchClass,
	bassPitchClass
}: {
	rootPitchClass: number;
	bassPitchClass?: number;
}): boolean => bassPitchClass !== undefined && bassPitchClass !== rootPitchClass;

export const bassIntervalFromRoot = (chord: StructuredChord): number | null =>
	hasDistinctBass(chord)
		? (chord.bassPitchClass! - chord.rootPitchClass + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE
		: null;

export const structuredChordFromClassification = (
	classification: ChordClassification | null
): StructuredChord | null => {
	if (!classification) return null;
	const { rootPitchClass, suffix, bassPitchClass } = classification;
	return hasDistinctBass({ rootPitchClass, bassPitchClass })
		? { rootPitchClass, suffix, bassPitchClass }
		: { rootPitchClass, suffix };
};

export const chordsAreEqual = (a: StructuredChord, b: StructuredChord): boolean =>
	a.rootPitchClass === b.rootPitchClass &&
	a.suffix === b.suffix &&
	(hasDistinctBass(a) ? a.bassPitchClass! : a.rootPitchClass) ===
		(hasDistinctBass(b) ? b.bassPitchClass! : b.rootPitchClass);

export const formatChordName = (chord: ChordClassification | StructuredChord | null): string => {
	if (!chord) return UNKNOWN_CHORD_NAME;
	const { rootPitchClass, suffix, bassPitchClass } = chord;
	const base = `${NOTE_NAMES[rootPitchClass]} ${suffix}`;
	return hasDistinctBass({ rootPitchClass, bassPitchClass })
		? `${base} / ${NOTE_NAMES[bassPitchClass!]}`
		: base;
};

type ClassifyInput = {
	bassMidi: number;
	trebleMidis: number[];
	bassAsRoot?: boolean;
};

type TrebleMatch = {
	rootPitchClass: number;
	suffix: string;
	priority: number;
};

export const createChordClassifier = ({
	templates = CHORD_TEMPLATES
}: { templates?: ChordTemplate[] } = {}) => {
	const templateSets = templates.map(({ suffix, intervals, priority = 0 }) => ({
		suffix,
		priority,
		intervalSet: new Set(intervals)
	}));

	const findTrebleMatches = (trebleMidis: number[]): TrebleMatch[] => {
		const treblePitchClasses = new Set(trebleMidis.map(pitchClass));
		return [...treblePitchClasses].flatMap((rootPitchClass) => {
			const intervals = intervalsFromRoot(rootPitchClass, treblePitchClasses);
			const match = templateSets.find(({ intervalSet }) => setsEqual(intervals, intervalSet));
			return match ? [{ rootPitchClass, suffix: match.suffix, priority: match.priority }] : [];
		});
	};

	const highestPriority = (matches: TrebleMatch[]): TrebleMatch =>
		[...matches].sort((a, b) => b.priority - a.priority)[0];

	const chooseMatchByBass = (matches: TrebleMatch[], bassPitchClass: number): TrebleMatch =>
		matches.find(({ rootPitchClass }) => rootPitchClass === bassPitchClass) ??
		highestPriority(matches);

	const findMatchWithBassAsRoot = (
		bassMidi: number,
		trebleMidis: number[]
	): { rootPitchClass: number; suffix: string } | null => {
		const bassPitchClass = pitchClass(bassMidi);
		const allPitchClasses = new Set([bassPitchClass, ...trebleMidis.map(pitchClass)]);
		const intervals = intervalsFromRoot(bassPitchClass, allPitchClasses);
		const match = templateSets.find(({ intervalSet }) => setsEqual(intervals, intervalSet));
		return match ? { rootPitchClass: bassPitchClass, suffix: match.suffix } : null;
	};

	const classify = ({
		bassMidi,
		trebleMidis,
		bassAsRoot = false
	}: ClassifyInput): ChordClassification | null => {
		if (bassAsRoot) {
			const match = findMatchWithBassAsRoot(bassMidi, trebleMidis);
			if (match) return { rootPitchClass: match.rootPitchClass, suffix: match.suffix };
		}

		const matches = findTrebleMatches(trebleMidis);
		if (matches.length === 0) return null;

		const bassPitchClass = pitchClass(bassMidi);
		const { rootPitchClass, suffix } = chooseMatchByBass(matches, bassPitchClass);
		return { rootPitchClass, suffix, bassPitchClass };
	};

	return { classify };
};
