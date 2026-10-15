import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import type { SongInput } from "../chord-processing/types.js";
import { applyHandReviewedCorrections } from "./applyHandReviewedCorrections.js";
import { groupSongs } from "./songBrowser.js";
import { sortAllSongs } from "./songBrowserData.js";
import {
	SONG_SHARD_COUNT,
	songShardFor,
	type HexMapSnapshot
} from "./hexMapSnapshot.js";
import { computeSongCoverage } from "../routes/demo/define-chord-progression/compute-coverage-of-all-songs/computeSongCoverage.js";

const DATA_DIR = path.join(process.cwd(), "static/data");
const SONGS_PATH = path.join(DATA_DIR, "songs.json");
const SNAPSHOT_PATH = path.join(DATA_DIR, "hexmap.json");
const SAMPLE_SIZE = 40;

describe("songShardFor", () => {
	it("is stable and in range", () => {
		const shard = songShardFor("some song|some artist");
		expect(shard).toBe(songShardFor("some song|some artist"));
		expect(shard).toBeGreaterThanOrEqual(0);
		expect(shard).toBeLessThan(SONG_SHARD_COUNT);
	});
});

// Generated files (npm run hexmap) aren't in git, so this only runs locally.
const haveData = fs.existsSync(SONGS_PATH) && fs.existsSync(SNAPSHOT_PATH);

describe.skipIf(!haveData)("hex map snapshot matches songs.json", () => {
	const load = () => {
		const inputs: SongInput[] = applyHandReviewedCorrections(
			JSON.parse(fs.readFileSync(SONGS_PATH, "utf8"))
		);
		const songs = sortAllSongs(groupSongs(inputs));
		const snapshot: HexMapSnapshot = JSON.parse(
			fs.readFileSync(SNAPSHOT_PATH, "utf8")
		);
		const step = Math.max(1, Math.floor(songs.length / SAMPLE_SIZE));
		const sample = songs.filter((_, index) => index % step === 0);
		return { songs, snapshot, sample };
	};

	it("has every song, with the coverage the live pipeline computes", () => {
		const { songs, snapshot, sample } = load();
		expect(snapshot.songKeys).toEqual(songs.map((song) => song.songKey));
		const indexByKey = new Map(snapshot.songKeys.map((key, i) => [key, i]));
		for (const song of sample) {
			const flat = snapshot.progressions[indexByKey.get(song.songKey)!];
			const baked = [];
			for (let at = 0; at < flat.length; at += 2) {
				baked.push({
					name: snapshot.progressionNames[flat[at]],
					coveragePercent: flat[at + 1]
				});
			}
			const live = computeSongCoverage(song).progressionCounts;
			expect(baked.map((entry) => entry.name)).toEqual(
				live.map((count) => count.name)
			);
			baked.forEach((entry, index) =>
				expect(entry.coveragePercent).toBeCloseTo(
					live[index].coveragePercent,
					1
				)
			);
		}
	}, 60_000);

	it("shards rebuild the same songs", () => {
		const { sample } = load();
		for (const song of sample) {
			const shard: SongInput[] = JSON.parse(
				fs.readFileSync(
					path.join(
						DATA_DIR,
						"song-shards",
						`${songShardFor(song.songKey)}.json`
					),
					"utf8"
				)
			);
			const rebuilt = groupSongs(shard).find(
				(candidate) => candidate.songKey === song.songKey
			);
			expect(rebuilt).toEqual(song);
		}
	}, 60_000);
});
