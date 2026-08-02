import { describe, expect, it } from "vitest";
import { computeFeatureAxes, progressionFeatures } from "./featureAxes.js";
import type { SongProgressionCounts } from "./progressionVocabulary.js";

const makeSong = (
	progressions: [chordProgression: string, scale: string, matchCount: number][]
): SongProgressionCounts => ({
	songKey: "song",
	progressionCounts: progressions.map(
		([chordProgression, scale, matchCount]) => ({
			chordProgression,
			scale:
				scale as SongProgressionCounts["progressionCounts"][number]["scale"],
			matchCount,
			coveragePercent: 0,
			isCore: true
		})
	)
});

describe("progressionFeatures", () => {
	it("rates a minor-scale progression darker than a major one", () => {
		expect(progressionFeatures("i-iv-V", "minor").darkness).toBeGreaterThan(
			progressionFeatures("I-IV-V", "major").darkness
		);
	});

	it("counts distinct scale degrees as harmonic breadth", () => {
		expect(progressionFeatures("I-IV-I-IV", "major").harmonicBreadth).toBe(2);
		expect(progressionFeatures("I-V-vi-IV", "major").harmonicBreadth).toBe(4);
	});

	it("detects extended chords as a share of the progression", () => {
		expect(progressionFeatures("ii7-V7-Imaj7", "major").extensionShare).toBe(1);
		expect(progressionFeatures("ii-V-I", "major").extensionShare).toBe(0);
	});
});

describe("computeFeatureAxes", () => {
	it("places major-key songs to the bright side of minor-key songs", () => {
		const bright = computeFeatureAxes(makeSong([["I-IV-V", "major", 4]]));
		const dark = computeFeatureAxes(makeSong([["i-iv-V", "minor", 4]]));
		expect(bright.x).toBeGreaterThan(dark.x);
	});

	it("places harmonically varied songs above simple vamps", () => {
		const simple = computeFeatureAxes(makeSong([["I-IV-I-IV", "major", 8]]));
		const complex = computeFeatureAxes(
			makeSong([
				["ii7-V7-Imaj7", "major", 2],
				["IV-iii-vi-ii", "major", 2],
				["I-vi-ii-V", "major", 2]
			])
		);
		expect(complex.y).toBeGreaterThan(simple.y);
	});

	it("keeps both axes inside the normalized range", () => {
		const { x, y } = computeFeatureAxes(makeSong([["i-VII-VI-V", "minor", 3]]));
		expect(x).toBeGreaterThanOrEqual(-1);
		expect(x).toBeLessThanOrEqual(1);
		expect(y).toBeGreaterThanOrEqual(-1);
		expect(y).toBeLessThanOrEqual(1);
	});

	it("returns the neutral position for a song with no matches", () => {
		expect(computeFeatureAxes(makeSong([]))).toEqual({ x: 0, y: -1 });
	});
});
