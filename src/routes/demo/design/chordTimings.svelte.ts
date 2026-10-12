import storage from "$utils/localStorage.js";
import {
	beatGridSeconds,
	chordStartSeconds,
	isSameChordBeats,
	moveChordBeat,
	secondsToBeat,
	type ChordBeatTimings
} from "./chordBeats.js";
import {
	fromChordBeatsFile,
	isChordBeatsFile,
	toChordBeatsFile
} from "./chordBeatsFile.js";
import {
	buildChordTimeline,
	buildEvenlySpacedChordTimeline,
	progressFractionOf,
	type SongSectionChords
} from "./chordTimeline.js";
import type { DesignSong } from "./designSongs.js";
import { migrateLegacyChordStartTimes } from "./legacyChordStartTimes.js";
import { roundToMilliseconds, SONG_START_SECONDS } from "./songTime.js";
import { popUndoEntry, pushUndoEntry } from "./undoHistory.js";

const storageKeyFor = (songKey: string): string =>
	`design-chord-beats:${songKey}`;

const legacyStorageKeyFor = (songKey: string): string =>
	`design-chord-start-times:${songKey}`;

const isSameTimings = (
	a: ChordBeatTimings | null,
	b: ChordBeatTimings | null
): boolean => JSON.stringify(a) === JSON.stringify(b);

const loadLocalTimings = (
	songKey: string,
	sections: SongSectionChords[]
): ChordBeatTimings | null => {
	const saved = storage.get<unknown>(storageKeyFor(songKey));
	if (isChordBeatsFile(saved)) return fromChordBeatsFile(saved, sections);
	const legacy = storage.get<Record<string, number>>(
		legacyStorageKeyFor(songKey)
	);
	return legacy ? migrateLegacyChordStartTimes(legacy, sections) : null;
};

export const createChordTimings = (
	getSong: () => DesignSong,
	getDuration: () => number
) => {
	const song = $derived(getSong());
	const storageKey = $derived(storageKeyFor(song.songKey));
	const committedTimings = $derived(
		fromChordBeatsFile(song.committedChordBeats, song.sections)
	);

	let localTimings = $state.raw<ChordBeatTimings | null>(
		loadLocalTimings(getSong().songKey, getSong().sections)
	);
	let undoStack = $state.raw<(ChordBeatTimings | null)[]>([]);

	const timings = $derived(localTimings ?? committedTimings);
	const duration = $derived(getDuration());
	const editable = $derived(Number.isFinite(duration) && duration > 0);

	const toFraction = (seconds: number): number =>
		progressFractionOf(seconds, duration);

	const timeline = $derived(
		editable
			? buildChordTimeline(
					song.sections,
					chordStartSeconds(timings).map(toFraction)
				)
			: buildEvenlySpacedChordTimeline(song.sections)
	);
	const beatFractions = $derived(
		editable ? beatGridSeconds(timings, duration).map(toFraction) : []
	);
	const file = $derived(toChordBeatsFile(timings, song.sections));

	const saveLocalTimings = (nextTimings: ChordBeatTimings | null) => {
		localTimings = nextTimings;
		if (nextTimings === null) storage.remove(storageKey);
		else storage.set(storageKey, toChordBeatsFile(nextTimings, song.sections));
	};

	const updateTimings = (changes: Partial<ChordBeatTimings>) =>
		saveLocalTimings({ ...timings, ...changes });

	const beginEdit = () => {
		undoStack = pushUndoEntry(undoStack, localTimings);
	};

	const moveChord = (index: number, startFraction: number) => {
		if (!editable) return;
		const chordBeats = moveChordBeat(
			timings.chordBeats,
			index,
			secondsToBeat(timings, startFraction * duration)
		);
		if (isSameChordBeats(chordBeats, timings.chordBeats)) return;
		updateTimings({ chordBeats });
	};

	const nudgeChord = (index: number, beatDelta: number) => {
		beginEdit();
		updateTimings({
			chordBeats: moveChordBeat(
				timings.chordBeats,
				index,
				timings.chordBeats[index] + beatDelta
			)
		});
	};

	const setStartSeconds = (seconds: number) => {
		if (!Number.isFinite(seconds)) return;
		beginEdit();
		updateTimings({
			startSeconds: Math.max(roundToMilliseconds(seconds), SONG_START_SECONDS)
		});
	};

	const setBeatsPerMinute = (beatsPerMinute: number) => {
		if (!Number.isFinite(beatsPerMinute) || beatsPerMinute <= 0) return;
		beginEdit();
		updateTimings({ beatsPerMinute });
	};

	const discardLocalEdits = () => {
		beginEdit();
		saveLocalTimings(null);
	};

	const undo = () => {
		const popped = popUndoEntry(undoStack, localTimings, isSameTimings);
		undoStack = popped?.remaining ?? [];
		if (popped) saveLocalTimings(popped.entry);
	};

	return {
		get timeline() {
			return timeline;
		},
		get beatFractions() {
			return beatFractions;
		},
		get chordBeats() {
			return timings.chordBeats;
		},
		get startSeconds() {
			return timings.startSeconds;
		},
		get beatsPerMinute() {
			return timings.beatsPerMinute;
		},
		get editable() {
			return editable;
		},
		get file() {
			return file;
		},
		get hasLocalEdits() {
			return localTimings !== null;
		},
		beginEdit,
		moveChord,
		nudgeChord,
		setStartSeconds,
		setBeatsPerMinute,
		discardLocalEdits,
		undo
	};
};
