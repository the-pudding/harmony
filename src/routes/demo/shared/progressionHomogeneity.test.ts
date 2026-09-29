import { describe, expect, it } from "vitest";
import type { SongProgressionCount } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
import {
	buildHomogeneityBandShares,
	computeSongHomogeneity,
	effectiveProgressionCountFor,
	homogeneityBandFor
} from "./progressionHomogeneity.js";

const makeCount = (name: string, coveragePercent: number): SongProgressionCount => ({
	chordProgression: name,
	name,
	scale: "major",
	matchCount: 1,
	chorusMatchCount: 0,
	coveragePercent,
	isCore: true
});

describe("computeSongHomogeneity", () => {
	it("scores a single-progression song as 1 effective progression", () => {
		const result = computeSongHomogeneity([makeCount("axis", 100)]);
		expect(result?.effectiveProgressionCount).toBeCloseTo(1);
		expect(result?.dominantShare).toBeCloseTo(1);
		expect(result?.dominantProgressionName).toBe("axis");
	});

	it("scores an even two-way split as 2 and an uneven one closer to 1", () => {
		expect(
			effectiveProgressionCountFor([makeCount("a", 50), makeCount("b", 50)])
		).toBeCloseTo(2);
		const uneven = effectiveProgressionCountFor([makeCount("a", 90), makeCount("b", 10)]);
		expect(uneven).toBeCloseTo(1 / (0.9 ** 2 + 0.1 ** 2));
	});

	it("normalizes over matched chords only, ignoring unmatched coverage", () => {
		const result = computeSongHomogeneity([makeCount("a", 30), makeCount("b", 30)]);
		expect(result?.effectiveProgressionCount).toBeCloseTo(2);
		expect(result?.progressionShares.map((share) => share.share)).toEqual([0.5, 0.5]);
	});

	it("merges repeated entries for the same canonical name", () => {
		const result = computeSongHomogeneity([makeCount("a", 40), makeCount("a", 40)]);
		expect(result?.distinctProgressionCount).toBe(1);
		expect(result?.effectiveProgressionCount).toBeCloseTo(1);
	});

	it("returns null when nothing is matched", () => {
		expect(computeSongHomogeneity([])).toBeNull();
		expect(computeSongHomogeneity([makeCount("a", 0)])).toBeNull();
	});
});

describe("homogeneityBandFor", () => {
	it("buckets effective counts into bands", () => {
		expect(homogeneityBandFor(1).id).toBe("single");
		expect(homogeneityBandFor(2).id).toBe("pair");
		expect(homogeneityBandFor(3).id).toBe("trio");
		expect(homogeneityBandFor(5).id).toBe("several");
		expect(homogeneityBandFor(40).id).toBe("many");
	});
});

describe("buildHomogeneityBandShares", () => {
	it("returns every band with shares summing to 100%", () => {
		const shares = buildHomogeneityBandShares([1, 1, 2, 7]);
		expect(shares.map((share) => share.songCount)).toEqual([2, 1, 0, 0, 1]);
		expect(shares.reduce((total, share) => total + share.sharePercent, 0)).toBeCloseTo(100);
	});
});
