import {
	NOTES_PER_OCTAVE,
	NOTE_NAMES,
	noteNameToPitchClass
} from "./chord-classifier/notes.js";
import { parseRomanToken } from "./romanNumerals.js";
import type { ProgressionChordInput } from "./types.js";
import { SCALE_INTERVALS, type ScaleName } from "./scale-intervals.js";

export { SCALE_INTERVALS, type ScaleName };

export const romanTokensToProgressionInKey = (
	tokens: string[],
	key: string,
	scale: string
): ProgressionChordInput[] => {
	const intervals = SCALE_INTERVALS[scale];
	if (!intervals) throw new Error(`Unknown scale "${scale}"`);

	const tonic = noteNameToPitchClass(key);

	return tokens.map((token) => {
		const parsed = parseRomanToken(token);
		if (!parsed) throw new Error(`Cannot parse roman token: "${token}"`);

		const { degree, flat, suffix } = parsed;
		const interval = intervals[degree - 1];
		if (interval === undefined)
			throw new Error(`Degree ${degree} out of range for scale "${scale}"`);

		const rootPitchClass =
			(tonic + interval - (flat ? 1 : 0) + NOTES_PER_OCTAVE * 2) %
			NOTES_PER_OCTAVE;

		return { noteName: NOTE_NAMES[rootPitchClass], suffix };
	});
};
