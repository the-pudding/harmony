import storage from "$utils/localStorage.js";
import {
	moveChordStartTime,
	resolveChordStartTimes,
	toChordStartTimesRecord,
	type ChordStartTimes
} from "./chordStartTimes.js";
import {
	buildChordTimeline,
	buildEvenlySpacedChordTimeline,
	chordKeysOf,
	progressFractionOf
} from "./chordTimeline.js";
import type { DesignSong } from "./designSongs.js";
import { popUndoEntry, pushUndoEntry } from "./undoHistory.js";

const JSON_INDENT = "\t";

const storageKeyFor = (songKey: string): string =>
	`design-chord-start-times:${songKey}`;

const isSameStartTimes = (
	a: ChordStartTimes | null,
	b: ChordStartTimes | null
): boolean => JSON.stringify(a) === JSON.stringify(b);

const loadLocalStartTimes = (songKey: string): ChordStartTimes | null =>
	storage.get<ChordStartTimes>(storageKeyFor(songKey)) ?? null;

export const createChordTimings = (
	getSong: () => DesignSong,
	getDuration: () => number
) => {
	const song = $derived(getSong());
	const storageKey = $derived(storageKeyFor(song.songKey));
	const chordKeys = $derived(chordKeysOf(song.sections));

	let localStartTimes = $state.raw<ChordStartTimes | null>(
		loadLocalStartTimes(getSong().songKey)
	);
	let undoStack = $state.raw<(ChordStartTimes | null)[]>([]);

	const duration = $derived(getDuration());
	const editable = $derived(Number.isFinite(duration) && duration > 0);
	const startTimes = $derived(
		editable
			? resolveChordStartTimes(
					chordKeys,
					localStartTimes ?? song.committedChordStartTimes,
					duration
				)
			: []
	);
	const timeline = $derived(
		editable
			? buildChordTimeline(
					song.sections,
					startTimes.map((startTime) => progressFractionOf(startTime, duration))
				)
			: buildEvenlySpacedChordTimeline(song.sections)
	);
	const json = $derived(
		editable
			? JSON.stringify(
					toChordStartTimesRecord(chordKeys, startTimes),
					null,
					JSON_INDENT
				)
			: null
	);

	const saveLocalStartTimes = (nextStartTimes: ChordStartTimes | null) => {
		localStartTimes = nextStartTimes;
		if (nextStartTimes === null) storage.remove(storageKey);
		else storage.set(storageKey, nextStartTimes);
	};

	const moveChord = (index: number, startFraction: number) => {
		if (!editable) return;
		saveLocalStartTimes(
			toChordStartTimesRecord(
				chordKeys,
				moveChordStartTime(
					startTimes,
					index,
					startFraction * duration,
					duration
				)
			)
		);
	};

	const beginEdit = () => {
		undoStack = pushUndoEntry(undoStack, localStartTimes);
	};

	const discardLocalEdits = () => {
		beginEdit();
		saveLocalStartTimes(null);
	};

	const undo = () => {
		const popped = popUndoEntry(undoStack, localStartTimes, isSameStartTimes);
		undoStack = popped?.remaining ?? [];
		if (popped) saveLocalStartTimes(popped.entry);
	};

	return {
		get timeline() {
			return timeline;
		},
		get editable() {
			return editable;
		},
		get json() {
			return json;
		},
		get hasLocalEdits() {
			return localStartTimes !== null;
		},
		beginEdit,
		moveChord,
		discardLocalEdits,
		undo
	};
};
