import {
	NOTE_NAMES,
	pitchClass
} from "../../src/chord-processing/chord-classifier/notes.js";

const NOTE_LETTER_PITCH_CLASSES: Record<string, number> = {
	C: 0,
	D: 2,
	E: 4,
	F: 5,
	G: 7,
	A: 9,
	B: 11
};
const NOTE_NAME_PATTERN = /^([A-Ga-g])([b#]*)$/;
const ACCIDENTAL_OFFSETS: Record<string, number> = { "#": 1, b: -1 };

export const parsePitchClass = (noteName: string): number | null => {
	const match = noteName.trim().match(NOTE_NAME_PATTERN);
	if (!match) return null;
	const offset = [...match[2]].reduce(
		(sum, accidental) => sum + ACCIDENTAL_OFFSETS[accidental],
		0
	);
	return pitchClass(NOTE_LETTER_PITCH_CLASSES[match[1].toUpperCase()] + offset);
};

export const toPitchClass = (noteName: string): number => {
	const parsed = parsePitchClass(noteName);
	if (parsed === null) throw new Error(`Invalid note name: "${noteName}"`);
	return parsed;
};

export const pitchClassName = (pc: number): string =>
	NOTE_NAMES[pitchClass(pc)];

export const canonicalNoteName = (noteName: string): string =>
	pitchClassName(toPitchClass(noteName));
