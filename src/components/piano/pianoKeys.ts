import {
	midiToNote,
	noteToMidi,
	type MidiCoercible
} from "../../chord-processing/chord-classifier/notes.js";
import type { Note } from "../../chord-processing/types.js";

export const PIANO_MIDI_START = 21; // A0
export const PIANO_MIDI_END = 108; // C8
export const TOTAL_WHITE_KEYS = 52;
export const BLACK_KEY_WIDTH_RATIO = 0.6; // relative to white key width

const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]); // C#, Eb, F#, Ab, Bb

export const isPitchClassBlack = (pitchClass: number): boolean =>
	BLACK_PITCH_CLASSES.has(pitchClass);

export type PianoKeyData = {
	midi: number;
	note: Note;
	isBlack: boolean;
	/** Position in white-key units. White keys are integers; black keys are at N-0.5 (between whites). */
	whitePosition: number;
	label: string;
};

export const generatePianoKeys = (): PianoKeyData[] => {
	const keys: PianoKeyData[] = [];
	let whiteIndex = 0;

	for (let midi = PIANO_MIDI_START; midi <= PIANO_MIDI_END; midi++) {
		const pc = ((midi % 12) + 12) % 12;
		const isBlack = isPitchClassBlack(pc);
		const note = midiToNote(midi);

		keys.push({
			midi,
			note,
			isBlack,
			whitePosition: isBlack ? whiteIndex - 0.5 : whiteIndex,
			label: `${note.noteName}${note.octave}`
		});

		if (!isBlack) whiteIndex++;
	}

	return keys;
};

export const noteToMidiNumber = (note: Note): number => noteToMidi(note);

export const splitNoteToMidi = (splitNote: MidiCoercible): number => {
	try {
		return noteToMidi(
			typeof splitNote === "string"
				? (() => {
						const m = splitNote.match(/^([A-G][#b]?)(-?\d+)$/);
						if (!m) return { noteName: "C" as Note["noteName"], octave: 4 };
						return { noteName: m[1] as Note["noteName"], octave: parseInt(m[2], 10) };
					})()
				: (splitNote as Note)
		);
	} catch {
		return noteToMidi({ noteName: "C", octave: 4 });
	}
};

export const PIANO_KEYS = generatePianoKeys();
