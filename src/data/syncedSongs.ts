// Time-synced chord data recorded in the Record tab of /demo/record.
// One file per song at src/data/synced-songs/{songKey}.json, listing each
// chord change heard in its audio at static/assets/audio/synced-songs/
// {audioFile}: when it starts (seconds into the audio), the chord, and its
// roman numeral in the song's key. Only the region has chord data; the last
// chord lasts until region.endSeconds.
import { SCALE_INTERVALS } from "../chord-processing/scale-intervals.js";
import type { MusicalKey } from "../chord-processing/chordInKey.js";
import topProgressions from "./charts/top-progressions.csv";
import syncedSongReference from "./synced-songs/reference.csv";
import {
	parseReferenceRows,
	type SyncedSongReferenceRow
} from "./syncedSongReference.js";

export type { SyncedSongReferenceRow };

export type SyncedSongRegion = {
	startSeconds: number;
	endSeconds: number;
};

export type SyncedSongChord = {
	seconds: number;
	chord: string;
	roman: string;
};

export type SyncedSongFile = {
	songKey: string;
	audioFile: string;
	key: MusicalKey;
	region: SyncedSongRegion;
	chords: SyncedSongChord[];
};

// An audio file in static/assets/audio/synced-songs, named {artist}__{song}.
export type SyncedSongAudio = {
	songKey: string;
	audioFile: string;
};

export const SYNCED_SONG_AUDIO_DIRECTORY = "assets/audio/synced-songs";
export const SYNCED_SONG_DATA_DIRECTORY = "src/data/synced-songs";

const AUDIO_FILE_PATTERN = /^([^_/\\.][^/\\]*?__[^/\\]+)\.(mp3|mp4)$/i;

export const parseSyncedSongAudioFile = (
	fileName: string
): SyncedSongAudio | null => {
	const match = fileName.match(AUDIO_FILE_PATTERN);
	return match ? { songKey: match[1], audioFile: fileName } : null;
};

// Safe to use as a file name: no path separators and no leading dot.
export const isSyncedSongKey = (value: unknown): value is string =>
	typeof value === "string" && /^[^_/\\.][^/\\]*__[^/\\]+$/.test(value);

const isFiniteNumber = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

export const isMusicalKey = (value: unknown): value is MusicalKey =>
	isRecord(value) &&
	typeof value.tonic === "string" &&
	typeof value.scale === "string" &&
	value.scale in SCALE_INTERVALS;

const isRegion = (value: unknown): value is SyncedSongRegion =>
	isRecord(value) &&
	isFiniteNumber(value.startSeconds) &&
	isFiniteNumber(value.endSeconds) &&
	value.endSeconds > value.startSeconds;

const isChord = (value: unknown): value is SyncedSongChord =>
	isRecord(value) &&
	isFiniteNumber(value.seconds) &&
	typeof value.chord === "string" &&
	typeof value.roman === "string";

export const isSyncedSongFile = (value: unknown): value is SyncedSongFile =>
	isRecord(value) &&
	isSyncedSongKey(value.songKey) &&
	typeof value.audioFile === "string" &&
	isMusicalKey(value.key) &&
	isRegion(value.region) &&
	Array.isArray(value.chords) &&
	value.chords.every(isChord);

const syncedSongModules = import.meta.glob<unknown>("./synced-songs/*.json", {
	eager: true,
	import: "default"
});

// Every committed synced song, by song key.
export const committedSyncedSongs: Record<string, SyncedSongFile> =
	Object.fromEntries(
		Object.values(syncedSongModules)
			.filter(isSyncedSongFile)
			.map((file) => [file.songKey, file])
	);

// Videos in static/assets/video/{videoId}.mp4 with chords recorded against
// the video's own timing (a live take, say, that doesn't line up with the
// song's synced audio). Same file shape as a synced song, saved at
// src/data/synced-videos/{videoId}.json and kept out of reference.csv; each
// video names its song (for the key and chord sheet) and cluster here.
export const SYNCED_VIDEO_DIRECTORY = "assets/video";
export const SYNCED_VIDEO_DATA_DIRECTORY = "src/data/synced-videos";

export type SyncedVideo = {
	videoId: string;
	songKey: string;
	cluster: string;
};

export const syncedVideos: SyncedVideo[] = [
	{
		videoId: "shania",
		songKey: "shania-twain__you-re-still-the-one",
		cluster: "happy walk up"
	}
];

export const isSyncedVideoId = (value: unknown): value is string =>
	syncedVideos.some((video) => video.videoId === value);

const syncedVideoModules = import.meta.glob<unknown>("./synced-videos/*.json", {
	eager: true,
	import: "default"
});

// Every committed synced video, by video id (its file name).
export const committedSyncedVideos: Record<string, SyncedSongFile> =
	Object.fromEntries(
		Object.entries(syncedVideoModules)
			.filter(([, file]) => isSyncedSongFile(file))
			.map(([modulePath, file]) => [
				modulePath.replace(/^.*\/|\.json$/g, ""),
				file as SyncedSongFile
			])
	);

// Which top-progression cluster each synced song belongs to, one row per
// song key at src/data/synced-songs/reference.csv, with the song's trimmed
// region (seconds into the audio) and whether it's shown. Saving a song in
// the Record audio tab adds or updates its row; the Featured songs tab sets
// each cluster's play order and visibility. See syncedSongReference.ts.
export const SYNCED_SONG_REFERENCE_FILE = "reference.csv";

export const syncedSongReferenceRows: SyncedSongReferenceRow[] =
	parseReferenceRows(syncedSongReference);

// The rows the app features: visible ones, in play order within each
// cluster.
export const featuredSyncedSongs: SyncedSongReferenceRow[] =
	syncedSongReferenceRows.filter((row) => row.visible);

// Every top-progression name, in rank order: the clusters a song can join.
export const syncedSongClusters: string[] = topProgressions.map(
	(row) => row.name
);

export const committedSyncedSongClusters: Record<string, string> =
	Object.fromEntries(
		syncedSongReferenceRows.map((row) => [row.songKey, row.cluster])
	);
