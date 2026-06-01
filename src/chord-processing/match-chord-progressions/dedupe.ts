import { chordsAreEqual } from "../chord-classifier/index.js";
import type { ParsedProgressionChord, ProgressionChordInput } from "../types.js";

export const progressionChordInputsAreEqual = (
	a: ProgressionChordInput,
	b: ProgressionChordInput
): boolean =>
	a.noteName === b.noteName &&
	a.suffix === b.suffix &&
	(a.bassNoteName ?? undefined) === (b.bassNoteName ?? undefined);

const dedupeAdjacent = <T>(items: T[], areEqual: (a: T, b: T) => boolean): T[] =>
	items.filter(
		(item, index) => index === 0 || !areEqual(item, items[index - 1]!)
	);

export const dedupeAdjacentProgressionInputs = (
	chords: ProgressionChordInput[]
): ProgressionChordInput[] =>
	dedupeAdjacent(chords, progressionChordInputsAreEqual);

export const dedupeAdjacentParsedProgression = (
	chords: ParsedProgressionChord[]
): ParsedProgressionChord[] => dedupeAdjacent(chords, chordsAreEqual);
