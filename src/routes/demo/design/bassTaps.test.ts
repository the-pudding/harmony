import { describe, expect, it } from "vitest";
import {
	bassTapStatus,
	MIN_SECONDS_BETWEEN_TAPS,
	nearestChordIndex,
	nextBassTap
} from "./bassTaps.js";

const CHORD_STARTS = [1, 3, 5, 7];

describe("nearestChordIndex", () => {
	it("picks the chord whose start is closest to the tap", () => {
		expect(nearestChordIndex(CHORD_STARTS, 0)).toBe(0);
		expect(nearestChordIndex(CHORD_STARTS, 3.4)).toBe(1);
		expect(nearestChordIndex(CHORD_STARTS, 4.6)).toBe(2);
		expect(nearestChordIndex(CHORD_STARTS, 99)).toBe(3);
	});
});

describe("bassTapStatus", () => {
	const CHORD_NAMES = ["A", "F#m", "D", "E"];

	it("describes the last tapped chord and the next one", () => {
		expect(
			bassTapStatus(true, { chordIndex: 1, seconds: 3 }, CHORD_NAMES)
		).toBe("set F#m (2/4) · next D");
	});

	it("marks the final chord", () => {
		expect(
			bassTapStatus(true, { chordIndex: 3, seconds: 7 }, CHORD_NAMES)
		).toBe("set E (4/4) · last chord");
	});
});

describe("nextBassTap", () => {
	it("anchors the first tap to the nearest chord", () => {
		expect(nextBassTap(null, 2.8, CHORD_STARTS)).toEqual({
			chordIndex: 1,
			seconds: 2.8
		});
	});

	it("assigns each following tap to the next chord", () => {
		const previous = { chordIndex: 1, seconds: 2.8 };
		expect(nextBassTap(previous, 4, CHORD_STARTS)).toEqual({
			chordIndex: 2,
			seconds: 4
		});
	});

	it("ignores taps too close to the previous one", () => {
		const previous = { chordIndex: 1, seconds: 2.8 };
		const tooSoon = previous.seconds + MIN_SECONDS_BETWEEN_TAPS / 2;
		expect(nextBassTap(previous, tooSoon, CHORD_STARTS)).toBeNull();
	});

	it("ignores taps after the last chord", () => {
		const previous = { chordIndex: 3, seconds: 7 };
		expect(nextBassTap(previous, 9, CHORD_STARTS)).toBeNull();
	});

	it("re-anchors when the playhead moved backwards", () => {
		const previous = { chordIndex: 3, seconds: 7 };
		expect(nextBassTap(previous, 1.2, CHORD_STARTS)).toEqual({
			chordIndex: 0,
			seconds: 1.2
		});
	});

	it("ignores taps when there are no chords", () => {
		expect(nextBassTap(null, 1, [])).toBeNull();
	});
});
