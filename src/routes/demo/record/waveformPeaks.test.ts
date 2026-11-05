import { describe, expect, it } from "vitest";
import {
	computeWaveformPeaks,
	cropPeaksToRange,
	waveformAreaPath
} from "./waveformPeaks.js";

describe("cropPeaksToRange", () => {
	it("keeps the peaks between two fractions, rounding outward", () => {
		expect(cropPeaksToRange([1, 2, 3, 4], 0, 0.5)).toEqual([1, 2]);
		expect(cropPeaksToRange([1, 2, 3, 4], 0, 0.6)).toEqual([1, 2, 3]);
		expect(cropPeaksToRange([1, 2, 3, 4], 0.3, 1)).toEqual([2, 3, 4]);
		expect(cropPeaksToRange([1, 2, 3, 4], 0, 1)).toEqual([1, 2, 3, 4]);
	});
});

describe("computeWaveformPeaks", () => {
	it("takes the loudest sample per bucket across channels, normalized", () => {
		const left = new Float32Array([0.1, -0.5, 0.2, 0.1]);
		const right = new Float32Array([0.2, 0.1, -0.25, 0]);
		expect(computeWaveformPeaks([left, right], 2)).toEqual([1, 0.5]);
	});

	it("returns no peaks for empty audio", () => {
		expect(computeWaveformPeaks([], 4)).toEqual([]);
		expect(computeWaveformPeaks([new Float32Array([])], 4)).toEqual([]);
	});

	it("leaves silent audio at zero", () => {
		expect(computeWaveformPeaks([new Float32Array([0, 0])], 2)).toEqual([0, 0]);
	});
});

describe("waveformAreaPath", () => {
	it("traces the top contour then mirrors back along the bottom", () => {
		expect(waveformAreaPath([1, 0.5])).toBe("M0 0L1 0.5L1 1.5L0 2Z");
	});

	it("is empty without peaks", () => {
		expect(waveformAreaPath([])).toBe("");
	});
});
