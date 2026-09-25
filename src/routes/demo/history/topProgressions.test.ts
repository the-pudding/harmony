import { describe, expect, it } from "vitest";
import type { ScaleName } from "../../../chord-processing/scales.js";
import type { SongCoverageEntry, SongProgressionCount } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
import { computeTopProgressions } from "./topProgressions.js";

const AXIS = "I-V-vi-IV";
const DOO_WOP = "I-vi-IV-V";

const makeCount = (
	chordProgression: string,
	coveragePercent: number,
	isCore = true,
	name: string = chordProgression
): SongProgressionCount => ({
	chordProgression,
	name,
	scale: "major" as ScaleName,
	matchCount: 1,
	chorusMatchCount: 1,
	coveragePercent,
	isCore
});

const makeEntry = (
	songKey: string,
	counts: SongProgressionCount[]
): SongCoverageEntry => ({
	songKey,
	title: songKey,
	artists: ["Someone"],
	coveragePercent: 50,
	matchingProgressions: counts.filter((c) => c.isCore).map((c) => c.name),
	progressionCounts: counts,
	biasOverrides: []
});

describe("computeTopProgressions", () => {
	it("ranks by average per-song coverage percent, not raw song count", () => {
		// AXIS appears in only 1 of 4 songs but covers 100% of it; DOO_WOP
		// appears in all 4 songs but only covers a sliver of each — average
		// coverage should still favor whichever has the bigger per-song share.
		const entries = [
			makeEntry("s1", [makeCount(AXIS, 100)]),
			makeEntry("s2", [makeCount(DOO_WOP, 5)]),
			makeEntry("s3", [makeCount(DOO_WOP, 5)]),
			makeEntry("s4", [makeCount(DOO_WOP, 5)])
		];

		const ranked = computeTopProgressions(entries, 10);
		expect(ranked[0].name).toBe(AXIS);
		expect(ranked[0].avgCoveragePercent).toBeCloseTo(25); // 100/4
		expect(ranked[1].name).toBe(DOO_WOP);
		expect(ranked[1].avgCoveragePercent).toBeCloseTo(3.75); // 15/4
	});

	it("counts songs where the progression never appears as 0%, not excluded", () => {
		const entries = [
			makeEntry("s1", [makeCount(AXIS, 50)]),
			makeEntry("s2", []),
			makeEntry("s3", []),
			makeEntry("s4", [])
		];

		const ranked = computeTopProgressions(entries, 10);
		expect(ranked[0].avgCoveragePercent).toBeCloseTo(12.5); // 50/4, not 50/1
	});

	it("reports song count and share alongside the average", () => {
		const entries = [
			makeEntry("s1", [makeCount(AXIS, 40)]),
			makeEntry("s2", [makeCount(AXIS, 20)]),
			makeEntry("s3", [])
		];

		const ranked = computeTopProgressions(entries, 10);
		expect(ranked[0].songCount).toBe(2);
		expect(ranked[0].songSharePercent).toBeCloseTo((2 / 3) * 100);
	});

	it("does not double count a progression matched more than once in the same song", () => {
		const entries = [
			makeEntry("s1", [makeCount(AXIS, 10), makeCount(AXIS, 10)])
		];

		const ranked = computeTopProgressions(entries, 10);
		expect(ranked[0].songCount).toBe(1);
		// Both matches' coveragePercent still contribute to the sum/average.
		expect(ranked[0].avgCoveragePercent).toBeCloseTo(20);
	});

	it("ignores non-core progression counts", () => {
		const entries = [makeEntry("s1", [makeCount(AXIS, 50, false)])];
		expect(computeTopProgressions(entries, 10)).toHaveLength(0);
	});

	it("respects the limit", () => {
		const entries = [
			makeEntry("s1", [
				makeCount("A", 10, true, "a"),
				makeCount("B", 20, true, "b"),
				makeCount("C", 30, true, "c")
			])
		];
		expect(computeTopProgressions(entries, 2)).toHaveLength(2);
	});

	it("returns an empty array for no songs", () => {
		expect(computeTopProgressions([], 10)).toEqual([]);
	});
});
