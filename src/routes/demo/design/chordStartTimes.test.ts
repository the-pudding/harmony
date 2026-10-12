import { describe, expect, it } from "vitest";
import {
	formatTimestamp,
	MIN_CHORD_GAP_SECONDS,
	moveChordStartTime,
	resolveChordStartTimes,
	toChordStartTimesRecord
} from "./chordStartTimes.js";

const DURATION = 100;
const keys = ["a", "b", "c", "d"];

describe("resolveChordStartTimes", () => {
	it("spaces chords evenly when nothing is saved", () => {
		expect(resolveChordStartTimes(keys, {}, DURATION)).toEqual([0, 25, 50, 75]);
	});

	it("prefers saved times and keeps them in chord order", () => {
		expect(
			resolveChordStartTimes(keys, { a: 10, b: 5, c: 60 }, DURATION)
		).toEqual([10, 10, 60, 75]);
	});
});

describe("moveChordStartTime", () => {
	const startTimes = [0, 25, 50, 75];

	it("moves only the dragged chord when it stays between neighbors", () => {
		expect(moveChordStartTime(startTimes, 1, 30, DURATION)).toEqual([
			0, 30, 50, 75
		]);
	});

	it("pushes later chords forward to preserve order", () => {
		const moved = moveChordStartTime(startTimes, 1, 60, DURATION);
		expect(moved[1]).toBe(60);
		expect(moved[2]).toBeCloseTo(60 + MIN_CHORD_GAP_SECONDS);
		expect(moved[3]).toBe(75);
	});

	it("pushes earlier chords back to preserve order", () => {
		const moved = moveChordStartTime(startTimes, 2, 10, DURATION);
		expect(moved[0]).toBe(0);
		expect(moved[1]).toBeCloseTo(10 - MIN_CHORD_GAP_SECONDS);
		expect(moved[2]).toBe(10);
	});

	it("keeps every chord inside the song", () => {
		const moved = moveChordStartTime(startTimes, 0, DURATION * 2, DURATION);
		expect(moved[3]).toBeLessThan(DURATION);
		expect(moveChordStartTime(startTimes, 3, -DURATION, DURATION)[0]).toBe(0);
	});
});

describe("toChordStartTimesRecord", () => {
	it("keys start times by chord, rounded to milliseconds", () => {
		expect(toChordStartTimesRecord(["a", "b"], [1.23456, 2])).toEqual({
			a: 1.235,
			b: 2
		});
	});
});

describe("formatTimestamp", () => {
	it("formats minutes and zero-padded seconds", () => {
		expect(formatTimestamp(65.5)).toBe("1:05.50");
		expect(formatTimestamp(3)).toBe("0:03.00");
	});
});
