import type { SyncedSongFile, SyncedSongRegion } from "$data/syncedSongs.js";
import { isMusicalKey, isSyncedSongFile } from "$data/syncedSongs.js";
import {
	romanTokenForChord,
	type MusicalKey
} from "../../../chord-processing/chordInKey.js";
import {
	formatChordName,
	parseChordName
} from "../../../chord-processing/formatChordDisplay.js";
import type { StructuredChord } from "../../../chord-processing/types.js";
import {
	buildChordTimeline,
	type ChordTimeline,
	type SongSectionChords
} from "./chordTimeline.js";
import type { NamedChord } from "./matchedSongSections.js";
import { roundToMilliseconds, SONG_START_SECONDS } from "./songTime.js";

export const MIN_SECONDS_BETWEEN_CHORDS = 0.05;
export const MIN_REGION_SECONDS = 1;

// endSeconds null: the region runs to the end of the audio, which isn't
// known until its metadata loads.
export type RegionDraft = {
	startSeconds: number;
	endSeconds: number | null;
};

export type RegionEdge = "start" | "end";

export type RecordedChord = {
	seconds: number;
	chord: StructuredChord;
};

// Chords are kept in order of their start.
export type SyncedTimings = {
	key: MusicalKey;
	region: RegionDraft;
	chords: RecordedChord[];
};

const EMPTY_TIMELINE: ChordTimeline = { chords: [], groups: [], sections: [] };

export const emptyTimings = (key: MusicalKey): SyncedTimings => ({
	key,
	region: { startSeconds: SONG_START_SECONDS, endSeconds: null },
	chords: []
});

export const resolveRegion = (
	region: RegionDraft,
	duration: number
): SyncedSongRegion => ({
	startSeconds: region.startSeconds,
	endSeconds: region.endSeconds ?? roundToMilliseconds(duration)
});

const bySeconds = (a: RecordedChord, b: RecordedChord): number =>
	a.seconds - b.seconds;

export const fromSyncedSongFile = (
	value: unknown,
	fallbackKey: MusicalKey
): SyncedTimings => {
	if (!isSyncedSongFile(value)) return emptyTimings(fallbackKey);
	return {
		key: value.key,
		region: { ...value.region },
		chords: value.chords
			.flatMap(({ seconds, chord }) => {
				const parsed = parseChordName(chord);
				return parsed ? [{ seconds, chord: parsed }] : [];
			})
			.sort(bySeconds)
	};
};

export const nameChord = (
	{ chord }: RecordedChord,
	key: MusicalKey
): NamedChord => ({
	chord,
	name: formatChordName(chord),
	roman: romanTokenForChord(chord, key)
});

export const toSyncedSongFile = (
	song: { songKey: string; audioFile: string },
	timings: SyncedTimings,
	duration: number
): SyncedSongFile => ({
	songKey: song.songKey,
	audioFile: song.audioFile,
	key: timings.key,
	region: resolveRegion(timings.region, duration),
	chords: timings.chords.map((recorded) => {
		const { name, roman } = nameChord(recorded, timings.key);
		return { seconds: recorded.seconds, chord: name, roman };
	})
});

const isStructuredChord = (value: unknown): value is StructuredChord => {
	if (typeof value !== "object" || value === null) return false;
	const chord = value as Record<string, unknown>;
	return (
		Number.isInteger(chord.rootPitchClass) &&
		typeof chord.suffix === "string" &&
		(chord.bassPitchClass === undefined ||
			Number.isInteger(chord.bassPitchClass))
	);
};

// Timings saved locally by this page, or null if they're invalid.
export const parseStoredTimings = (value: unknown): SyncedTimings | null => {
	if (typeof value !== "object" || value === null) return null;
	const { key, region, chords } = value as Partial<SyncedTimings>;
	const isValid =
		isMusicalKey(key) &&
		typeof region?.startSeconds === "number" &&
		(region.endSeconds === null || typeof region.endSeconds === "number") &&
		Array.isArray(chords) &&
		chords.every(
			(recorded) =>
				typeof recorded?.seconds === "number" &&
				isStructuredChord(recorded.chord)
		);
	return isValid ? { key, region, chords } : null;
};

export const isSameTimings = (
	a: SyncedTimings | null,
	b: SyncedTimings | null
): boolean => JSON.stringify(a) === JSON.stringify(b);

export const isWithinRegion = (
	region: SyncedSongRegion,
	seconds: number
): boolean => seconds >= region.startSeconds && seconds < region.endSeconds;

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max);

export const moveRegionEdge = (
	region: SyncedSongRegion,
	edge: RegionEdge,
	seconds: number,
	duration: number
): SyncedSongRegion => {
	const rounded = roundToMilliseconds(seconds);
	return edge === "start"
		? {
				...region,
				startSeconds: clamp(
					rounded,
					SONG_START_SECONDS,
					region.endSeconds - MIN_REGION_SECONDS
				)
			}
		: {
				...region,
				endSeconds: clamp(
					rounded,
					region.startSeconds + MIN_REGION_SECONDS,
					duration
				)
			};
};

// Recording replaces whatever was there between `fromSeconds` and
// `toSeconds` with the chords played in that pass, like punching in on a
// tape. Playing the same chord twice in a row records both.
export const punchInChords = (
	base: RecordedChord[],
	played: RecordedChord[],
	fromSeconds: number,
	toSeconds: number
): RecordedChord[] =>
	[
		...base.filter(
			(recorded) =>
				recorded.seconds < fromSeconds || recorded.seconds > toSeconds
		),
		...played.map((recorded) => ({
			seconds: roundToMilliseconds(recorded.seconds),
			chord: recorded.chord
		}))
	].sort(bySeconds);

// Moves a chord, keeping it between its neighbors and in the region.
export const moveChordStart = (
	chords: RecordedChord[],
	index: number,
	seconds: number,
	region: SyncedSongRegion
): RecordedChord[] => {
	const previous = chords[index - 1]?.seconds ?? -Infinity;
	const next = chords[index + 1]?.seconds ?? Infinity;
	const moved = roundToMilliseconds(
		clamp(
			seconds,
			Math.max(region.startSeconds, previous + MIN_SECONDS_BETWEEN_CHORDS),
			Math.min(region.endSeconds, next) - MIN_SECONDS_BETWEEN_CHORDS
		)
	);
	if (moved === chords[index]?.seconds) return chords;
	return chords.map((recorded, otherIndex) =>
		otherIndex === index ? { ...recorded, seconds: moved } : recorded
	);
};

export const removeChord = (
	chords: RecordedChord[],
	index: number
): RecordedChord[] => chords.filter((_, otherIndex) => otherIndex !== index);

export type TimelineView = {
	startSeconds: number;
	endSeconds: number;
};

const fractionIn = (view: TimelineView, seconds: number): number =>
	clamp(
		(seconds - view.startSeconds) / (view.endSeconds - view.startSeconds),
		0,
		1
	);

// Lays out recorded chords over `view`; the last one lasts until the end of
// the region. `section` holds the chords' names, numerals and progression
// groups, in the same order.
export const buildSyncedChordTimeline = (
	section: SongSectionChords,
	chords: RecordedChord[],
	region: SyncedSongRegion,
	view: TimelineView
): ChordTimeline => {
	if (chords.length === 0) return EMPTY_TIMELINE;
	const timeline = buildChordTimeline(
		[section],
		[...chords.map(({ seconds }) => seconds), region.endSeconds].map(
			(seconds) => fractionIn(view, seconds)
		)
	);
	return {
		...timeline,
		chords: timeline.chords.filter(
			(chord) => chord.endFraction > chord.startFraction
		),
		sections: []
	};
};
