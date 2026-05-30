import { coerceToMidi, type MidiCoercible } from "../chord-classifier/notes.js";
import type { StableChordCandidate } from "../types.js";

const DEFAULT_SETTLE_MS = 60;

const sortedMidiArray = (set: Set<number>): number[] => [...set].sort((a, b) => a - b);

const arraysEqual = (a: number[], b: number[]): boolean =>
	a.length === b.length && a.every((v, i) => v === b[i]);

type ChordGaterOptions = {
	splitBassAndTrebleOn?: MidiCoercible;
	settleMs?: number;
	onStableChordCandidate?: (candidate: StableChordCandidate) => void;
	onStableChordRelease?: (released: StableChordCandidate) => void;
};

export const createChordGater = ({
	splitBassAndTrebleOn = "C4",
	settleMs = DEFAULT_SETTLE_MS,
	onStableChordCandidate,
	onStableChordRelease
}: ChordGaterOptions = {}) => {
	let splitMidi = coerceToMidi(splitBassAndTrebleOn);

	let heldNotes = new Set<number>();
	let activeStableMidi: StableChordCandidate | null = null;
	let settleTimer: ReturnType<typeof setTimeout> | null = null;

	const settleAndNotify = () => {
		settleTimer = null;
		const sorted = sortedMidiArray(heldNotes);
		const bass = sorted.filter((m) => m <= splitMidi);
		const treble = sorted.filter((m) => m > splitMidi);
		const isValid = bass.length >= 1 && treble.length >= 1;

		const candidateMatchesActive =
			activeStableMidi &&
			isValid &&
			activeStableMidi.bassMidi === bass[0] &&
			arraysEqual(activeStableMidi.trebleMidis, treble);

		if (candidateMatchesActive) return;

		if (activeStableMidi) {
			const released = activeStableMidi;
			activeStableMidi = null;
			onStableChordRelease?.(released);
		}

		if (!isValid) return;

		const next: StableChordCandidate = {
			bassMidi: bass[0],
			trebleMidis: treble
		};
		activeStableMidi = next;
		onStableChordCandidate?.(next);
	};

	const scheduleSettle = () => {
		if (settleTimer) clearTimeout(settleTimer);
		settleTimer = setTimeout(settleAndNotify, settleMs);
	};

	const handleNoteOn = (midi: number) => {
		heldNotes = new Set([...heldNotes, midi]);
		scheduleSettle();
	};

	const handleNoteOff = (midi: number) => {
		heldNotes = new Set([...heldNotes].filter((n) => n !== midi));
		scheduleSettle();
	};

	const setSplitBassAndTrebleOn = (next: MidiCoercible) => {
		splitMidi = coerceToMidi(next);
		scheduleSettle();
	};

	const dispose = () => {
		if (settleTimer) clearTimeout(settleTimer);
		settleTimer = null;
		if (activeStableMidi) {
			const released = activeStableMidi;
			activeStableMidi = null;
			onStableChordRelease?.(released);
		}
		heldNotes = new Set();
	};

	return { handleNoteOn, handleNoteOff, dispose, setSplitBassAndTrebleOn };
};
