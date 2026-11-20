// Each synced song's audio in static/assets/audio/synced-songs is only the
// stretch the app plays, cut from the full song in full-synced-songs
// by `npm run clean-mp3` (tasks/clean-mp3.ts), which lists each cut in
// syncedSongClips.json. Chord and clip times all stay in the full song's
// seconds: a clip file starts offsetSeconds into its song, so its audio is at
// songSeconds - offsetSeconds.
import type { SignatureSongs } from "./signatureSongs.js";
import type { SyncedSongFile } from "./syncedSongs.js";
import type { SyncedSongReferenceRow } from "./syncedSongReference.js";
import clipManifest from "./syncedSongClips.json";

export type SyncedSongClip = {
	// Where the clip starts and ends, in the full song's seconds.
	offsetSeconds: number;
	endSeconds: number;
	// The full song it was cut from, so a replaced song gets re-cut.
	fullSongSha1: string;
	bitrate: string;
};

export const syncedSongClips: Record<string, SyncedSongClip> = clipManifest;

// Where a song's clip file starts in the song (0 if it isn't cut).
export const clipOffsetSeconds = (songKey: string): number =>
	syncedSongClips[songKey]?.offsetSeconds ?? 0;

export type ClipRange = { startSeconds: number; endSeconds: number };

// The stretch of each song the app can play, by song key: its synced region
// and chords, its reference.csv region, and any Signatures override.
export const neededClipRanges = ({
	files,
	rows,
	signatures
}: {
	files: readonly SyncedSongFile[];
	rows: readonly SyncedSongReferenceRow[];
	signatures: Record<string, SignatureSongs>;
}): Map<string, ClipRange> => {
	const ranges = new Map<string, ClipRange>();
	const include = (songKey: string, start: number, end: number) => {
		const range = ranges.get(songKey);
		ranges.set(songKey, {
			startSeconds: Math.min(start, range?.startSeconds ?? start),
			endSeconds: Math.max(end, range?.endSeconds ?? end)
		});
	};
	const songKeys = new Set(files.map((file) => file.songKey));
	for (const file of files) {
		const { startSeconds, endSeconds } = file.region;
		include(file.songKey, startSeconds, endSeconds);
		for (const { seconds } of file.chords) {
			include(file.songKey, seconds, seconds);
		}
	}
	for (const row of rows) {
		if (!songKeys.has(row.songKey)) continue;
		include(row.songKey, row.startSeconds, row.endSeconds);
	}
	for (const { songs } of Object.values(signatures)) {
		for (const { songKey, startSeconds, endSeconds } of songs) {
			const range = ranges.get(songKey);
			if (!range) continue;
			include(
				songKey,
				startSeconds ?? range.startSeconds,
				endSeconds ?? range.endSeconds
			);
		}
	}
	return ranges;
};
