import { describe, expect, it } from "vitest";
import type { HexMapSnapshot } from "./hexMapSnapshot.js";
import {
	similarSongs,
	songsByArtist,
	songsFeaturingAny
} from "./songNeighbors.js";

const snapshot = {
	songKeys: ["a", "b", "c", "d", "e"],
	titles: ["A", "B", "C", "D", "E"],
	artists: [["X"], ["X", "Y"], ["Y"], ["Z"], ["Z"]],
	x: [0, 0, 0, 0, 0],
	y: [0, 0, 0, 0, 0],
	progressionNames: ["p0", "p1", "p2"],
	// flattened [nameIndex, coverage, ...]
	progressions: [[0, 50, 1, 50], [0, 50, 1, 40], [0, 10, 2, 90], [2, 80], []],
	popularity: [0, 0, 0, 0, 0],
	years: [2010, 2005, 0, 1999, 2001],
	clusters: []
} as unknown as HexMapSnapshot;

describe("songsByArtist", () => {
	it("lists multi-artist songs under each artist", () => {
		const grouped = songsByArtist(snapshot);
		expect(grouped.get("X")).toEqual(["a", "b"]);
		expect(grouped.get("Y")).toEqual(["b", "c"]);
		expect(grouped.get("Z")).toEqual(["d", "e"]);
	});
});

describe("songsFeaturingAny", () => {
	it("combines artists, drops the excluded song and sorts by year", () => {
		expect(songsFeaturingAny(snapshot, ["X", "Y"], "b")).toEqual(["a", "c"]);
		expect(songsFeaturingAny(snapshot, ["X", "Y"])).toEqual(["b", "a", "c"]);
		expect(songsFeaturingAny(snapshot, ["Nobody"])).toEqual([]);
	});
});

describe("similarSongs", () => {
	it("never returns the song itself and sorts by score", () => {
		const result = similarSongs(snapshot, "a");
		expect(result.map((r) => r.songId)).toEqual(["b", "c"]);
		expect(result[0].score).toBeGreaterThan(result[1].score);
	});

	it("leaves out songs sharing no progression", () => {
		expect(similarSongs(snapshot, "a").map((r) => r.songId)).not.toContain("d");
		expect(similarSongs(snapshot, "d").map((r) => r.songId)).toEqual(["c"]);
	});

	it("leaves out songs scoring below minScore", () => {
		const all = similarSongs(snapshot, "a");
		const cutoff = (all[0].score + all[1].score) / 2;
		expect(similarSongs(snapshot, "a", 8, cutoff)).toEqual([all[0]]);
	});

	it("returns nothing for unknown or empty songs, and honors k", () => {
		expect(similarSongs(snapshot, "nope")).toEqual([]);
		expect(similarSongs(snapshot, "e")).toEqual([]);
		expect(similarSongs(snapshot, "a", 1)).toHaveLength(1);
	});
});
