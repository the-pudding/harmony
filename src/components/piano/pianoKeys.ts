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
export { DEFAULT_SPLIT_BASS_NOTE as DEFAULT_SPLIT_NOTE } from "../../chord-processing/chord-gater/index.js";
export const BASS_LABEL_COLOR = "#a78bfa";
export const TREBLE_LABEL_COLOR = "#60a5fa";
export const SPLIT_EDIT_ICON_SIZE_PX = 8;
export const SPLIT_EDIT_ICON_STROKE_WIDTH = 1.75;
export const SPLIT_KEY_BORDER_BASE_WIDTH_PX = 2;
export const SPLIT_KEY_BORDER_EXTRA_WIDTH_PX = 3;
export const SPLIT_KEY_BORDER_WIDTH_PX =
	SPLIT_KEY_BORDER_BASE_WIDTH_PX + SPLIT_KEY_BORDER_EXTRA_WIDTH_PX;
export const SPLIT_KEY_BORDER_COLOR = BASS_LABEL_COLOR;
export const SENTINEL_LABEL_COLOR = "#52525b";
export const SENTINEL_LABEL_FONT_SIZE_PX = 7;
export const SENTINEL_LABEL_STROKE_WIDTH_PX = 0.5;
export const SENTINEL_LABEL_STROKE_COLOR = "rgba(255, 255, 255, 0.35)";

const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]); // C#, Eb, F#, Ab, Bb

export const isPitchClassBlack = (pitchClass: number): boolean =>
	BLACK_PITCH_CLASSES.has(pitchClass);

export type PianoSentinel = {
	midis: Set<number>;
	label: string;
};

export type SentinelBounds = {
	leftPercent: number;
	widthPercent: number;
	label: string;
};

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
						return {
							noteName: m[1] as Note["noteName"],
							octave: parseInt(m[2], 10)
						};
					})()
				: (splitNote as Note)
		);
	} catch {
		return noteToMidi({ noteName: "C", octave: 4 });
	}
};

export const PIANO_KEYS = generatePianoKeys();

export const getSentinelBounds = (
	sentinelMidis: Set<number>,
	label: string
): SentinelBounds | null => {
	if (sentinelMidis.size === 0) return null;

	const sentinelWhiteKeys = PIANO_KEYS.filter(
		(key) => sentinelMidis.has(key.midi) && !key.isBlack
	);
	if (sentinelWhiteKeys.length === 0) return null;

	const leftWhitePosition = Math.min(
		...sentinelWhiteKeys.map((key) => key.whitePosition)
	);
	const rightWhitePosition =
		Math.max(...sentinelWhiteKeys.map((key) => key.whitePosition)) + 1;

	return {
		leftPercent: (leftWhitePosition / TOTAL_WHITE_KEYS) * 100,
		widthPercent:
			((rightWhitePosition - leftWhitePosition) / TOTAL_WHITE_KEYS) * 100,
		label
	};
};
