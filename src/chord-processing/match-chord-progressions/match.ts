import { bassIntervalFromRoot } from "../chord-classifier/index.js";
import { NOTES_PER_OCTAVE } from "../chord-classifier/notes.js";
import type { AbstractProgression, ParsedProgressionChord, SubProgressionMatch } from "../types.js";

const intervalBetweenRoots = (fromRootPitchClass: number, toRootPitchClass: number): number =>
	(toRootPitchClass - fromRootPitchClass + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE;

export const toAbstractProgression = (chords: ParsedProgressionChord[]): AbstractProgression => ({
	suffixes: chords.map(({ suffix }) => suffix),
	deltas: chords.slice(1).map(({ rootPitchClass }, i) =>
		intervalBetweenRoots(chords[i].rootPitchClass, rootPitchClass)
	),
	bassIntervals: chords.map(bassIntervalFromRoot)
});

const arraysEqual = <T>(a: T[], b: T[]): boolean =>
	a.length === b.length && a.every((v, i) => v === b[i]);

const abstractProgressionsMatch = (a: AbstractProgression, b: AbstractProgression): boolean =>
	arraysEqual(a.suffixes, b.suffixes) &&
	arraysEqual(a.deltas, b.deltas) &&
	arraysEqual(a.bassIntervals, b.bassIntervals);

const sliceCyclic = <T>(array: T[], start: number, length: number): T[] =>
	Array.from({ length }, (_, i) => array[(start + i) % array.length]);

export const findSubProgressionMatches = (
	songProgression: ParsedProgressionChord[],
	searchProgression: ParsedProgressionChord[],
	{ wrap = true }: { wrap?: boolean } = {}
): SubProgressionMatch[] => {
	if (searchProgression.length === 0) return [];
	if (searchProgression.length > songProgression.length) return [];

	const searchAbstract = toAbstractProgression(searchProgression);
	const lastStart = wrap
		? songProgression.length - 1
		: songProgression.length - searchProgression.length;

	return Array.from({ length: lastStart + 1 }, (_, start) => start).flatMap((start) => {
		const window = sliceCyclic(songProgression, start, searchProgression.length);
		return abstractProgressionsMatch(toAbstractProgression(window), searchAbstract)
			? [{ start, length: searchProgression.length }]
			: [];
	});
};

export const progressionContainsSubProgression = (
	songProgression: ParsedProgressionChord[],
	searchProgression: ParsedProgressionChord[],
	options?: { wrap?: boolean }
): boolean => findSubProgressionMatches(songProgression, searchProgression, options).length > 0;

export const isPositionInMatch = (
	position: number,
	{ start, length }: SubProgressionMatch,
	songLength: number
): boolean => {
	const offsetsInMatch = Array.from({ length }, (_, i) => (start + i) % songLength);
	return offsetsInMatch.includes(position);
};
