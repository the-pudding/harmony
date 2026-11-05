import { createChordClassifier } from "../../../chord-processing/chord-classifier/index.js";
import { pitchClass } from "../../../chord-processing/chord-classifier/notes.js";
import {
	diatonicChordOnBass,
	type MusicalKey
} from "../../../chord-processing/chordInKey.js";
import type { StructuredChord } from "../../../chord-processing/types.js";

// Notes this close to a chord change's first note are part of that change
// (a rolled or slightly-late chord), not a new one.
export const CHORD_WINDOW_SECONDS = 0.15;

const classifier = createChordClassifier();

// The chord the held notes spell, with the lowest note as its bass. A lone
// bass note (or anything that isn't a full chord) is taken as the chord
// that belongs on that note in the key.
export const chordOfNotes = (
	midis: number[],
	key: MusicalKey
): StructuredChord | null => {
	if (midis.length === 0) return null;
	const sorted = [...midis].sort((a, b) => a - b);
	const classification = classifier.classify({
		bassMidi: sorted[0],
		trebleMidis: sorted
	});
	return classification ?? diatonicChordOnBass(pitchClass(sorted[0]), key);
};

export const joinsChordChange = (
	changeStartSeconds: number | undefined,
	seconds: number
): boolean =>
	changeStartSeconds !== undefined &&
	seconds >= changeStartSeconds &&
	seconds - changeStartSeconds < CHORD_WINDOW_SECONDS;
