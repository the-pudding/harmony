import type { SyncedSongRegion } from "$data/syncedSongs.js";
import type { MusicalKey } from "../../../chord-processing/chordInKey.js";
import type { StructuredChord } from "../../../chord-processing/types.js";
import { chordOfNotes, joinsChordChange } from "./chordRecording.js";
import { isWithinRegion, type RecordedChord } from "./syncedTimings.js";

type ChordRecorderOptions = {
	getKey: () => MusicalKey;
	getRegion: () => SyncedSongRegion;
	isPlaying: () => boolean;
	readPlaybackSeconds: () => number;
	onPassStart: (fromSeconds: number) => void;
	onChordChange: (change: RecordedChord, seconds: number) => void;
	onFollow: (seconds: number) => void;
	onPassEnd: (seconds: number) => void;
};

// Groups notes played together into one chord change. While recording, a
// pass replaces whatever chords the playhead moves over.
export const createChordRecorder = ({
	getKey,
	getRegion,
	isPlaying,
	readPlaybackSeconds,
	onPassStart,
	onChordChange,
	onFollow,
	onPassEnd
}: ChordRecorderOptions) => {
	let recording = $state(false);
	let lastChord = $state.raw<StructuredChord | null>(null);
	let ignoredOutsideRegion = $state(false);
	let changeStartSeconds: number | undefined;
	let changeNotes: number[] = [];

	const start = () => {
		ignoredOutsideRegion = false;
		changeStartSeconds = undefined;
		recording = true;
		onPassStart(readPlaybackSeconds());
	};

	const stop = () => {
		recording = false;
		onPassEnd(readPlaybackSeconds());
	};

	const toggle = () => (recording ? stop() : start());

	const noteOn = (midi: number) => {
		const seconds = readPlaybackSeconds();
		const joins = joinsChordChange(changeStartSeconds, seconds);
		changeNotes = joins ? [...changeNotes, midi] : [midi];
		if (!joins) changeStartSeconds = seconds;
		lastChord = chordOfNotes(changeNotes, getKey());

		if (!recording || !isPlaying() || !lastChord) return;
		ignoredOutsideRegion = !isWithinRegion(getRegion(), changeStartSeconds!);
		if (ignoredOutsideRegion) return;
		onChordChange({ seconds: changeStartSeconds!, chord: lastChord }, seconds);
	};

	// Erases what was there as the playhead passes over it.
	const follow = (seconds: number) => {
		if (recording) onFollow(seconds);
	};

	return {
		get recording() {
			return recording;
		},
		get lastChord() {
			return lastChord;
		},
		get ignoredOutsideRegion() {
			return ignoredOutsideRegion;
		},
		toggle,
		noteOn,
		follow
	};
};
