import { describe, expect, it } from "vitest";
import { signatureSongs } from "./signatureSongs.js";
import { neededClipRanges, syncedSongClips } from "./syncedSongClips.js";
import {
	committedSyncedSongs,
	syncedSongReferenceRows,
	type SyncedSongFile
} from "./syncedSongs.js";

const file = (
	songKey: string,
	startSeconds: number,
	endSeconds: number,
	chordSeconds: number[] = []
): SyncedSongFile => ({
	songKey,
	audioFile: `${songKey}.mp3`,
	key: { tonic: "C", scale: "major" },
	region: { startSeconds, endSeconds },
	chords: chordSeconds.map((seconds) => ({ seconds, chord: "C", roman: "I" }))
});

const row = (songKey: string, startSeconds: number, endSeconds: number) => ({
	cluster: "c",
	songKey,
	startSeconds,
	endSeconds,
	visible: true
});

describe("neededClipRanges", () => {
	it("spans the region, chords, reference row and signature overrides", () => {
		const ranges = neededClipRanges({
			files: [file("a__a", 10, 20, [9.5, 15])],
			rows: [row("a__a", 11, 21), row("b__b", 0, 5)],
			signatures: {
				s: { progression: "p", songs: [{ songKey: "a__a", endSeconds: 25 }] }
			}
		});
		expect([...ranges]).toEqual([
			["a__a", { startSeconds: 9.5, endSeconds: 25 }]
		]);
	});
});

// Fails when npm run clean-mp3 hasn't been run since a song was added or
// its region moved past its clip.
describe("committed clips", () => {
	const ranges = neededClipRanges({
		files: Object.values(committedSyncedSongs),
		rows: syncedSongReferenceRows,
		signatures: signatureSongs
	});

	it("cover everything the app plays", () => {
		const uncovered = [...ranges].flatMap(([songKey, range]) => {
			const clip = syncedSongClips[songKey];
			return clip &&
				clip.offsetSeconds <= range.startSeconds &&
				clip.endSeconds >= range.endSeconds
				? []
				: [songKey];
		});
		expect(uncovered, "run npm run clean-mp3").toEqual([]);
	});
});
