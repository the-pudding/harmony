import coreProgressions from "$data/core-progressions.js";
import type { SyncedSongFile } from "$data/syncedSongs.js";
import storage from "$utils/localStorage.js";
import type { MusicalKey } from "../../../chord-processing/chordInKey.js";
import type { DesignSong } from "./designSongs.js";
import { buildRecordedSongSection } from "./matchedSongSections.js";
import {
	fromSyncedSongFile,
	isSameTimings,
	moveChordStart,
	moveRegionEdge,
	nameChord,
	parseStoredTimings,
	punchInChords,
	removeChord,
	resolveRegion,
	toSyncedSongFile,
	type RecordedChord,
	type RegionEdge,
	type SyncedTimings
} from "./syncedTimings.js";
import { popUndoEntry, pushUndoEntry } from "./undoHistory.js";

const storageKeyFor = (songKey: string): string =>
	`synced-song-chords:${songKey}`;

// The chords there when recording (re)started, the chords played since, and
// the stretch of audio the pass has covered.
type RecordingPass = {
	base: RecordedChord[];
	played: RecordedChord[];
	fromSeconds: number;
	toSeconds: number;
};

// Unsaved edits live in localStorage until they're saved to the repo.
export const createSyncedSongTimings = (
	getSong: () => DesignSong,
	getCommittedFile: () => SyncedSongFile | undefined,
	getDuration: () => number
) => {
	const song = $derived(getSong());
	const storageKey = $derived(storageKeyFor(song.songKey));

	let committedFile = $state.raw(getCommittedFile());
	const committedTimings = $derived(
		fromSyncedSongFile(committedFile, song.key)
	);

	let localTimings = $state.raw<SyncedTimings | null>(
		parseStoredTimings(storage.get<unknown>(storageKeyFor(getSong().songKey)))
	);
	let undoStack = $state.raw<(SyncedTimings | null)[]>([]);
	let pass: RecordingPass | null = null;

	const timings = $derived(localTimings ?? committedTimings);
	const duration = $derived(getDuration());
	const editable = $derived(Number.isFinite(duration) && duration > 0);
	const region = $derived(resolveRegion(timings.region, duration));
	const namedChords = $derived(
		timings.chords.map((recorded) => nameChord(recorded, timings.key))
	);
	const section = $derived(
		buildRecordedSongSection(
			song.songKey,
			namedChords,
			timings.key,
			coreProgressions
		)
	);
	const file = $derived(toSyncedSongFile(song, timings, duration));

	const writeLocalTimings = (next: SyncedTimings | null) => {
		localTimings = next;
		if (next === null) storage.remove(storageKey);
		else storage.set(storageKey, next);
	};

	// Any other edit made while recording (clearing, deleting, undoing…)
	// restarts the pass from the edited chords, so the pass can't bring back
	// what the edit removed.
	const saveLocalTimings = (next: SyncedTimings | null) => {
		writeLocalTimings(next);
		if (pass)
			pass = {
				base: timings.chords,
				played: [],
				fromSeconds: pass.toSeconds,
				toSeconds: pass.toSeconds
			};
	};

	const updateTimings = (changes: Partial<SyncedTimings>) =>
		saveLocalTimings({ ...timings, ...changes });

	const beginEdit = () => {
		undoStack = pushUndoEntry(undoStack, localTimings);
	};

	const setKey = (key: MusicalKey) => {
		beginEdit();
		updateTimings({ key });
	};

	// One recording pass is one undo step.
	const startRecordingPass = (fromSeconds: number) => {
		beginEdit();
		pass = {
			base: timings.chords,
			played: [],
			fromSeconds,
			toSeconds: fromSeconds
		};
	};

	// Replaces what the pass has covered up to `seconds` with what was played.
	const followRecordingPass = (seconds: number) => {
		if (!pass || !editable) return;
		pass.fromSeconds = Math.min(pass.fromSeconds, seconds);
		pass.toSeconds = Math.max(pass.toSeconds, seconds);
		writeLocalTimings({
			...timings,
			chords: punchInChords(
				pass.base,
				pass.played,
				pass.fromSeconds,
				pass.toSeconds
			)
		});
	};

	// A change that starts where the last one did is more notes of that
	// chord, so it replaces it.
	const recordChordChange = (change: RecordedChord, seconds: number) => {
		if (!pass) return;
		const isSameChange = pass.played.at(-1)?.seconds === change.seconds;
		pass.played = isSameChange
			? [...pass.played.slice(0, -1), change]
			: [...pass.played, change];
		followRecordingPass(seconds);
	};

	const endRecordingPass = (seconds: number) => {
		followRecordingPass(seconds);
		pass = null;
	};

	const moveChord = (index: number, seconds: number) => {
		if (!editable) return;
		const chords = moveChordStart(timings.chords, index, seconds, region);
		if (chords !== timings.chords) updateTimings({ chords });
	};

	const nudgeChord = (index: number, secondsDelta: number) => {
		const recorded = timings.chords[index];
		if (!recorded) return;
		beginEdit();
		moveChord(index, recorded.seconds + secondsDelta);
	};

	const deleteChord = (index: number) => {
		beginEdit();
		updateTimings({ chords: removeChord(timings.chords, index) });
	};

	const moveRegion = (edge: RegionEdge, seconds: number) => {
		if (!editable || !Number.isFinite(seconds)) return;
		updateTimings({ region: moveRegionEdge(region, edge, seconds, duration) });
	};

	const setRegionEdge = (edge: RegionEdge, seconds: number) => {
		beginEdit();
		moveRegion(edge, seconds);
	};

	const clearChords = () => {
		beginEdit();
		updateTimings({ chords: [] });
	};

	const discardLocalEdits = () => {
		beginEdit();
		saveLocalTimings(null);
	};

	// The saved file is now what's committed, so there are no local edits.
	const markSaved = (savedFile: SyncedSongFile) => {
		committedFile = savedFile;
		saveLocalTimings(null);
	};

	const undo = () => {
		const popped = popUndoEntry(undoStack, localTimings, isSameTimings);
		undoStack = popped?.remaining ?? [];
		if (popped) saveLocalTimings(popped.entry);
	};

	return {
		get key() {
			return timings.key;
		},
		get chords() {
			return timings.chords;
		},
		get section() {
			return section;
		},
		get region() {
			return region;
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
		get hasRecordedChords() {
			return timings.chords.length > 0;
		},
		beginEdit,
		setKey,
		startRecordingPass,
		followRecordingPass,
		recordChordChange,
		endRecordingPass,
		moveChord,
		nudgeChord,
		deleteChord,
		moveRegion,
		setRegionEdge,
		clearChords,
		discardLocalEdits,
		markSaved,
		undo
	};
};
