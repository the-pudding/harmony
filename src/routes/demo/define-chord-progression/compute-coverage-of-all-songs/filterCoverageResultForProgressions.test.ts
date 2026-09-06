import { describe, expect, it } from "vitest";
import type { ScaleName } from "../../../../chord-processing/scales.js";
import type { SongCoverageEntry, SongProgressionCount } from "./computeSongCoverage.js";
import {
	coveragePercentForProgressions,
	filterCoverageResultForProgressions,
	MAX_COVERAGE_PERCENT,
	type AllSongsCoverageResult
} from "./filterCoverageResultForProgressions.js";

const AXIS = "I-V-vi-IV";
const DOO_WOP = "I-vi-IV-V";
const GAP_FILL = "IV-V-iii-vi";

const makeCount = (
	chordProgression: string,
	coveragePercent: number,
	isCore: boolean
): SongProgressionCount => ({
	chordProgression,
	scale: "major" as ScaleName,
	matchCount: 1,
	chorusMatchCount: 0,
	coveragePercent,
	isCore
});

const makeSong = (
	overrides: Partial<SongCoverageEntry> &
		Pick<SongCoverageEntry, "songKey" | "coveragePercent">
): SongCoverageEntry => ({
	title: overrides.songKey,
	artists: [],
	matchingProgressions: [],
	progressionCounts: [],
	biasOverrides: [],
	...overrides
});

const makeResult = (songCoverages: SongCoverageEntry[]): AllSongsCoverageResult => ({
	songCoverages,
	progressionMatchRates: {},
	progressionMatchCounts: {},
	biasOverrides: []
});

describe("coveragePercentForProgressions", () => {
	it("sums v2 tile percents in the filter set, including non-core tiles", () => {
		const song = makeSong({
			songKey: "mostly-gap",
			coveragePercent: 100,
			matchingProgressions: [AXIS],
			progressionCounts: [
				makeCount(AXIS, 0, true),
				makeCount(GAP_FILL, 100, false)
			]
		});

		expect(
			coveragePercentForProgressions(song, new Set([AXIS, GAP_FILL]))
		).toBe(MAX_COVERAGE_PERCENT);
		expect(coveragePercentForProgressions(song, new Set([AXIS]))).toBe(0);
	});

	it("does not require a core matchingProgressions entry to count a tile", () => {
		const song = makeSong({
			songKey: "gap-only-axis",
			coveragePercent: 100,
			matchingProgressions: [],
			progressionCounts: [makeCount(AXIS, 40, false)]
		});

		expect(coveragePercentForProgressions(song, new Set([AXIS]))).toBe(40);
	});

	it("caps overlapping summed percents at 100", () => {
		const song = makeSong({
			songKey: "overlap",
			coveragePercent: 100,
			matchingProgressions: [AXIS, DOO_WOP],
			progressionCounts: [makeCount(AXIS, 80, true), makeCount(DOO_WOP, 50, true)]
		});

		expect(
			coveragePercentForProgressions(song, new Set([AXIS, DOO_WOP]))
		).toBe(MAX_COVERAGE_PERCENT);
	});
});

describe("filterCoverageResultForProgressions", () => {
	it("recomputes coverage from the selected progressions, not full-song explainedPercent", () => {
		const result = makeResult([
			makeSong({
				songKey: "tiny-core-full-song",
				coveragePercent: 100,
				matchingProgressions: [AXIS],
				progressionCounts: [
					makeCount(AXIS, 4, true),
					makeCount(GAP_FILL, 96, false)
				]
			})
		]);

		const filtered = filterCoverageResultForProgressions(result, [AXIS]);
		expect(filtered.songCoverages).toHaveLength(1);
		expect(filtered.songCoverages[0].coveragePercent).toBe(4);
		expect(filtered.songCoverages[0].matchingProgressions).toEqual([AXIS]);
	});

	it("includes songs whose only matching tile is a non-core count", () => {
		const result = makeResult([
			makeSong({
				songKey: "gap-tile-only",
				coveragePercent: 100,
				matchingProgressions: [],
				progressionCounts: [makeCount(AXIS, 25, false)]
			})
		]);

		const filtered = filterCoverageResultForProgressions(result, [AXIS]);
		expect(filtered.songCoverages).toHaveLength(1);
		expect(filtered.songCoverages[0].coveragePercent).toBe(25);
		expect(filtered.songCoverages[0].matchingProgressions).toEqual([AXIS]);
	});

	it("drops songs that have no selected progressions", () => {
		const result = makeResult([
			makeSong({
				songKey: "other-family",
				coveragePercent: 80,
				matchingProgressions: [DOO_WOP],
				progressionCounts: [makeCount(DOO_WOP, 80, true)]
			})
		]);

		expect(
			filterCoverageResultForProgressions(result, [AXIS]).songCoverages
		).toHaveLength(0);
	});
});
