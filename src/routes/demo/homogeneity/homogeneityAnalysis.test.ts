import { describe, expect, it } from "vitest";
import type { GroupedSong } from "../../../data/songBrowser.js";
import type {
	SongCoverageEntry,
	SongProgressionCount
} from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
import {
	buildDominantShareHistogram,
	buildRecipeProgressionRows,
	buildSongHomogeneityRows,
	computeHomogeneityHistory,
	DOMINANT_SHARE_BIN_COUNT,
	medianOf,
	pickBandExamples,
	pickMostDiverseSongs
} from "./homogeneityAnalysis.js";

const makeCount = (name: string, coveragePercent: number): SongProgressionCount => ({
	chordProgression: name,
	name,
	scale: "major",
	matchCount: 1,
	chorusMatchCount: 0,
	coveragePercent,
	isCore: true
});

const makeEntry = (
	songKey: string,
	coverages: [string, number][]
): SongCoverageEntry => ({
	songKey,
	title: songKey,
	artists: ["Someone"],
	coveragePercent: coverages.reduce((total, [, coverage]) => total + coverage, 0),
	matchingProgressions: coverages.map(([name]) => name),
	progressionCounts: coverages.map(([name, coverage]) => makeCount(name, coverage)),
	biasOverrides: []
});

const makeSong = (songKey: string, year: number, inTop10 = false): GroupedSong => ({
	songKey,
	title: songKey,
	artists: ["Someone"],
	year,
	inTop10,
	keyLabel: "C major",
	sections: []
});

const singleLoop = (songKey: string, name = "axis"): SongCoverageEntry =>
	makeEntry(songKey, [[name, 100]]);

const fourWay = (songKey: string): SongCoverageEntry =>
	makeEntry(songKey, [
		["a", 25],
		["b", 25],
		["c", 25],
		["d", 25]
	]);

const buildRows = (entries: SongCoverageEntry[], year: number, top10Keys: string[] = []) =>
	buildSongHomogeneityRows(
		entries,
		new Map(
			entries.map((entry) => [
				entry.songKey,
				makeSong(entry.songKey, year, top10Keys.includes(entry.songKey))
			])
		)
	);

describe("medianOf", () => {
	it("handles odd, even, and empty inputs", () => {
		expect(medianOf([3, 1, 2])).toBe(2);
		expect(medianOf([4, 1, 2, 3])).toBe(2.5);
		expect(medianOf([])).toBe(0);
	});
});

describe("buildSongHomogeneityRows", () => {
	it("skips songs with no matched progression and attaches a band", () => {
		const rows = buildRows([singleLoop("one"), makeEntry("none", [])], 2010);
		expect(rows).toHaveLength(1);
		expect(rows[0].band.id).toBe("single");
		expect(rows[0].year).toBe(2010);
	});
});

describe("buildDominantShareHistogram", () => {
	it("puts a 100% dominant share in the last bin", () => {
		const bins = buildDominantShareHistogram(buildRows([singleLoop("one"), fourWay("four")], 2010));
		expect(bins).toHaveLength(DOMINANT_SHARE_BIN_COUNT);
		expect(bins[DOMINANT_SHARE_BIN_COUNT - 1].songCount).toBe(1);
		expect(bins[2].songCount).toBe(1);
	});
});

describe("examples", () => {
	it("prefers top-10 hits within a band and ranks diverse songs by effective count", () => {
		const rows = buildRows([singleLoop("obscure"), singleLoop("hit"), fourWay("four")], 2010, [
			"hit"
		]);
		const single = pickBandExamples(rows, 2).find(({ band }) => band.id === "single");
		expect(single?.songs.map((song) => song.songKey)).toEqual(["hit", "obscure"]);
		expect(pickMostDiverseSongs(rows, 1)[0].songKey).toBe("four");
	});
});

describe("buildRecipeProgressionRows", () => {
	it("counts which progression single-loop songs are built on", () => {
		const rows = buildRows(
			[singleLoop("a1", "axis"), singleLoop("a2", "axis"), singleLoop("d1", "doo wop"), fourWay("four")],
			2010
		);
		const recipes = buildRecipeProgressionRows(rows, "single", 10, 1);
		expect(recipes.map((recipe) => [recipe.name, recipe.songCount])).toEqual([
			["axis", 2],
			["doo wop", 1]
		]);
		expect(recipes[0].sharePercent).toBeCloseTo((2 / 3) * 100);
	});
});

describe("computeHomogeneityHistory", () => {
	it("summarizes each decade with enough songs", () => {
		const homogeneousDecade = buildRows(
			Array.from({ length: 20 }, (_, i) => singleLoop(`new-${i}`)),
			2015
		);
		const diverseDecade = buildRows(
			Array.from({ length: 20 }, (_, i) => fourWay(`old-${i}`)),
			1975
		);
		const history = computeHomogeneityHistory([...homogeneousDecade, ...diverseDecade]);
		expect(history.map((row) => row.decade)).toEqual([1970, 2010]);
		expect(history[0].medianEffectiveCount).toBeCloseTo(4);
		expect(history[0].bandSharePercents.several).toBeCloseTo(100);
		expect(history[1].medianEffectiveCount).toBeCloseTo(1);
		expect(history[1].bandSharePercents.single).toBeCloseTo(100);
		expect(history[1].mostHomogeneousExample?.band.id).toBe("single");
	});

	it("drops decades below the minimum song count", () => {
		expect(computeHomogeneityHistory(buildRows([singleLoop("only")], 1965))).toHaveLength(0);
	});
});
