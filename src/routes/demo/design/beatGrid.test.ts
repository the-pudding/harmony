import { describe, expect, it } from "vitest";
import {
	beatsPerMinuteOf,
	fitChordGrid,
	secondsPerBeatAt
} from "./beatGrid.js";

describe("fitChordGrid", () => {
	it("recovers the spacing and offset of evenly timed chords", () => {
		const grid = fitChordGrid([
			{ index: 0, seconds: 1 },
			{ index: 1, seconds: 3 },
			{ index: 2, seconds: 5 }
		]);
		expect(grid?.secondsPerChord).toBeCloseTo(2);
		expect(grid?.offsetSeconds).toBeCloseTo(1);
	});

	it("averages out rough hand timing", () => {
		const grid = fitChordGrid([
			{ index: 0, seconds: 1.05 },
			{ index: 1, seconds: 2.95 },
			{ index: 2, seconds: 5.02 },
			{ index: 3, seconds: 6.98 }
		]);
		expect(grid?.secondsPerChord).toBeCloseTo(1.98, 1);
	});

	it("needs at least two distinct chords moving forward in time", () => {
		expect(fitChordGrid([{ index: 0, seconds: 1 }])).toBeNull();
		expect(
			fitChordGrid([
				{ index: 0, seconds: 5 },
				{ index: 1, seconds: 3 }
			])
		).toBeNull();
	});
});

describe("tempo conversions", () => {
	it("treats each chord as two beats", () => {
		expect(beatsPerMinuteOf({ offsetSeconds: 0, secondsPerChord: 1 })).toBe(
			120
		);
	});

	it("converts BPM to seconds per beat", () => {
		expect(secondsPerBeatAt(120)).toBe(0.5);
	});
});
