import type { Note, NoteName } from "../types.js";

export const NOTES_PER_OCTAVE = 12;
export const NOTE_NAMES: NoteName[] = [
	"C",
	"C#",
	"D",
	"Eb",
	"E",
	"F",
	"F#",
	"G",
	"Ab",
	"A",
	"Bb",
	"B"
];
export const LOWEST_MIDI_OCTAVE = -1;

const ENHARMONIC_EQUIVALENTS: Record<string, NoteName> = {
	Db: "C#",
	"D#": "Eb",
	"E#": "F",
	Fb: "E",
	Gb: "F#",
	"G#": "Ab",
	"A#": "Bb",
	"B#": "C",
	Cb: "B"
};

export const pitchClass = (midi: number): number =>
	((midi % NOTES_PER_OCTAVE) + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE;

export const midiToNote = (midi: number): Note => ({
	noteName: NOTE_NAMES[pitchClass(midi)],
	octave: Math.floor(midi / NOTES_PER_OCTAVE) + LOWEST_MIDI_OCTAVE
});

const canonicalNoteName = (noteName: string): NoteName =>
	ENHARMONIC_EQUIVALENTS[noteName] ?? (noteName as NoteName);

export const noteNameToPitchClass = (noteName: string): number => {
	const notePitchClass = NOTE_NAMES.indexOf(canonicalNoteName(noteName));
	if (notePitchClass === -1)
		throw new Error(`Invalid note name: "${noteName}"`);
	return notePitchClass;
};

export const noteToMidi = ({ noteName, octave }: Note): number =>
	NOTE_NAMES.indexOf(canonicalNoteName(noteName)) +
	(octave - LOWEST_MIDI_OCTAVE) * NOTES_PER_OCTAVE;

const parseNoteString = (str: string): Note => {
	const match = str.match(/^([A-G][#b]?)(-?\d+)$/);
	if (!match) throw new Error(`Invalid note string: "${str}"`);
	return { noteName: match[1] as NoteName, octave: parseInt(match[2], 10) };
};

export type MidiCoercible =
	| number
	| string
	| Note
	| { noteName: string; octave: number };

export const coerceToMidi = (value: MidiCoercible): number => {
	if (typeof value === "number") return value;
	if (typeof value === "string") return noteToMidi(parseNoteString(value));
	if (typeof value === "object" && value !== null) {
		const note: Note = {
			noteName: canonicalNoteName(value.noteName) as NoteName,
			octave: value.octave
		};
		return noteToMidi(note);
	}
	throw new Error(
		`Cannot coerce value to MIDI number: ${JSON.stringify(value)}`
	);
};
