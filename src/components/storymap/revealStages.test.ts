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
		const stages = revealStages(songs, ["axis", "four chords"])!;
		expect(stages.count).toBe(3);
		expect(stages.stageOf[16]).toBe(0);
		expect(stages.stageOf[3]).toBe(1);
		expect(stages.stageOf[35]).toBe(2);
	});

	it("matches names exactly, and the first listed cluster wins", () => {
		const stages = revealStages(songs, ["four chords (mini)", "axis"])!;
		expect(stages.count).toBe(3);
		expect(stages.stageOf[20]).toBe(0);
		expect(stages.stageOf[35]).toBe(0);
		expect(stages.stageOf[10]).toBe(0);
		expect(stages.stageOf[3]).toBe(2);
		expect(stages.stageOf[21]).toBe(1);
	});

	it("drops unknown names with a warning, and is null when none are known", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const stages = revealStages(songs, ["nope", "axis"])!;
		expect(stages.count).toBe(2);
		expect(stages.stageOf[20]).toBe(0);
		expect(stages.stageOf[0]).toBe(1);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("nope"));
		expect(revealStages(songs, ["nope"])).toBeNull();
		expect(revealStages(songs, [])).toBeNull();
	});
});
