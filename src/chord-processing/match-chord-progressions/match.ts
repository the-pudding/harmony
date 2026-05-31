import { bassIntervalFromRoot } from "../chord-classifier/index.js";
import { NOTES_PER_OCTAVE } from "../chord-classifier/notes.js";
import type {
	AbstractProgression,
	ParsedProgressionChord,
	PrecomputedAbstractProgression,
	SubProgressionMatch
} from "../types.js";

export const MIN_OCCURRENCES_DEFAULT = 1;
export const MIN_OCCURRENCES_AT_LEAST_TWICE = 2;

export type ProgressionMatchFilterOptions = {
	matchAtBeginningOnly?: boolean;
	minOccurrences?: number;
};

const intervalBetweenRoots = (fromRootPitchClass: number, toRootPitchClass: number): number =>
	(toRootPitchClass - fromRootPitchClass + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE;

export const toAbstractProgression = (chords: ParsedProgressionChord[]): AbstractProgression => ({
	suffixes: chords.map(({ suffix }) => suffix),
	deltas: chords.slice(1).map(({ rootPitchClass }, i) =>
		intervalBetweenRoots(chords[i].rootPitchClass, rootPitchClass)
	),
	bassIntervals: chords.map(bassIntervalFromRoot)
});

export const toPrecomputedAbstractProgression = (
	chords: ParsedProgressionChord[]
): PrecomputedAbstractProgression => {
	const abstract = toAbstractProgression(chords);
	const wrapDelta =
		chords.length > 1
			? intervalBetweenRoots(
					chords[chords.length - 1].rootPitchClass,
					chords[0].rootPitchClass
				)
			: 0;

	return { ...abstract, wrapDelta };
};

const arraysEqual = <T>(a: T[], b: T[]): boolean =>
	a.length === b.length && a.every((v, i) => v === b[i]);

const abstractProgressionsMatch = (a: AbstractProgression, b: AbstractProgression): boolean =>
	arraysEqual(a.suffixes, b.suffixes) &&
	arraysEqual(a.deltas, b.deltas) &&
	arraysEqual(a.bassIntervals, b.bassIntervals);

const sliceCyclic = <T>(array: T[], start: number, length: number): T[] =>
	Array.from({ length }, (_, i) => array[(start + i) % array.length]);

const deltaAtPosition = (
	songDeltas: number[],
	wrapDelta: number,
	fromIndex: number,
	songLength: number
): number => (fromIndex === songLength - 1 ? wrapDelta : songDeltas[fromIndex]);

const windowMatchesPrecomputed = (
	songAbstract: PrecomputedAbstractProgression,
	searchAbstract: AbstractProgression,
	start: number,
	length: number
): boolean => {
	const songLength = songAbstract.suffixes.length;

	for (let position = 0; position < length; position += 1) {
		const songIndex = (start + position) % songLength;
		if (songAbstract.suffixes[songIndex] !== searchAbstract.suffixes[position])
			return false;
		if (
			songAbstract.bassIntervals[songIndex] !==
			searchAbstract.bassIntervals[position]
		) {
			return false;
		}
	}

	for (let position = 0; position < length - 1; position += 1) {
		const fromIndex = (start + position) % songLength;
		const delta = deltaAtPosition(
			songAbstract.deltas,
			songAbstract.wrapDelta,
			fromIndex,
			songLength
		);
		if (delta !== searchAbstract.deltas[position]) return false;
	}

	return true;
};

export const findSubProgressionMatchesPrecomputed = (
	songAbstract: PrecomputedAbstractProgression,
	searchProgression: ParsedProgressionChord[],
	{ wrap = false }: { wrap?: boolean } = {}
): SubProgressionMatch[] => {
	if (searchProgression.length === 0) return [];
	if (searchProgression.length > songAbstract.suffixes.length) return [];

	const searchAbstract = toAbstractProgression(searchProgression);
	const songLength = songAbstract.suffixes.length;
	const searchLength = searchProgression.length;
	const lastStart = wrap ? songLength - 1 : songLength - searchLength;
	const matches: SubProgressionMatch[] = [];

	for (let start = 0; start <= lastStart; start += 1) {
		if (
			windowMatchesPrecomputed(
				songAbstract,
				searchAbstract,
				start,
				searchLength
			)
		) {
			matches.push({ start, length: searchLength });
		}
	}

	return matches;
};

export const applyProgressionMatchFilters = (
	matches: SubProgressionMatch[],
	{
		matchAtBeginningOnly = false,
		minOccurrences = MIN_OCCURRENCES_DEFAULT
	}: ProgressionMatchFilterOptions = {}
): SubProgressionMatch[] => {
	if (matches.length < minOccurrences) return [];
	if (matchAtBeginningOnly && !matches.some(({ start }) => start === 0))
		return [];
	return matches;
};

export const findSubProgressionMatches = (
	songProgression: ParsedProgressionChord[],
	searchProgression: ParsedProgressionChord[],
	{ wrap = false }: { wrap?: boolean } = {}
): SubProgressionMatch[] => {
	if (searchProgression.length === 0) return [];
	if (searchProgression.length > songProgression.length) return [];

	const searchAbstract = toAbstractProgression(searchProgression);
	const lastStart = wrap
		? songProgression.length - 1
		: songProgression.length - searchProgression.length;

	return Array.from({ length: lastStart + 1 }, (_, start) => start).flatMap(
		(start) => {
			const window = sliceCyclic(
				songProgression,
				start,
				searchProgression.length
			);
			return abstractProgressionsMatch(
				toAbstractProgression(window),
				searchAbstract
			)
				? [{ start, length: searchProgression.length }]
				: [];
		}
	);
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
