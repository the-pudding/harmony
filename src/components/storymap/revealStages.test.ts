import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSongTable } from "./songTable.js";
import { fixtureSnapshot } from "./testSnapshot.js";
import { revealStages } from "./revealStages.js";

const snapshot = fixtureSnapshot();
// "four chords" is songs 0–14, "axis" 15–29; "four chords (mini)" overlaps both.
snapshot.clusters.push({
	name: "four chords (mini)",
	progressionNames: ["I V vi IV"],
	showLabel: true,
	songIndexes: [10, 20, 35]
});
const songs = buildSongTable(snapshot);

describe("revealStages", () => {
	afterEach(() => vi.restoreAllMocks());

	it("gives each listed cluster a stage in order, then everyone else", () => {
		const stages = revealStages(songs, {
			songs: [],
			clusters: ["axis", "four chords"]
		})!;
		expect(stages.count).toBe(3);
		expect(stages.stageOf[16]).toBe(0);
		expect(stages.stageOf[3]).toBe(1);
		expect(stages.stageOf[35]).toBe(2);
	});

	it("matches names exactly, and the first listed cluster wins", () => {
		const stages = revealStages(songs, {
			songs: [],
			clusters: ["four chords (mini)", "axis"]
		})!;
		expect(stages.count).toBe(3);
		expect(stages.stageOf[20]).toBe(0);
		expect(stages.stageOf[35]).toBe(0);
		expect(stages.stageOf[10]).toBe(0);
		expect(stages.stageOf[3]).toBe(2);
		expect(stages.stageOf[21]).toBe(1);
	});

	it("drops unknown names with a warning, and is null when none are known", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const stages = revealStages(songs, {
			songs: [],
			clusters: ["nope", "axis"]
		})!;
		expect(stages.count).toBe(2);
		expect(stages.stageOf[20]).toBe(0);
		expect(stages.stageOf[0]).toBe(1);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("nope"));
		expect(revealStages(songs, { songs: [], clusters: ["nope"] })).toBeNull();
		expect(revealStages(songs, { songs: [], clusters: [] })).toBeNull();
	});

	it("moves the listed songs together first, before any cluster", () => {
		const stages = revealStages(songs, {
			songs: ["song-3", "song-35"],
			clusters: ["axis"]
		})!;
		expect(stages.count).toBe(3);
		expect(stages.stageOf[3]).toBe(0);
		expect(stages.stageOf[35]).toBe(0);
		expect(stages.stageOf[16]).toBe(1);
		expect(stages.stageOf[0]).toBe(2);
	});

	it("keeps a listed song that is also in a listed cluster in stage 0", () => {
		const stages = revealStages(songs, {
			songs: ["song-16"],
			clusters: ["axis"]
		})!;
		expect(stages.stageOf[16]).toBe(0);
		expect(stages.stageOf[17]).toBe(1);
	});

	it("counts two stages for songs alone", () => {
		const stages = revealStages(songs, {
			songs: ["song-1", "song-2"],
			clusters: []
		})!;
		expect(stages.count).toBe(2);
		expect(stages.stageOf[1]).toBe(0);
		expect(stages.stageOf[2]).toBe(0);
		expect(stages.stageOf[3]).toBe(1);
	});

	it("drops unknown song keys with a warning, and is null when none are known", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const stages = revealStages(songs, {
			songs: ["no-such-song", "song-4"],
			clusters: []
		})!;
		expect(stages.count).toBe(2);
		expect(stages.stageOf[4]).toBe(0);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("no-such-song"));
		expect(
			revealStages(songs, { songs: ["no-such-song"], clusters: [] })
		).toBeNull();
	});
});
