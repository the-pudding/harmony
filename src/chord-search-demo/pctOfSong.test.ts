import { describe, expect, it } from "vitest";
import type {
	GroupedSongSearchResult,
	ParsedProgressionChord
} from "../chord-processing/types.js";
import {
	clampPctOfSongRange,
	matchingChordCountFromMatches,
	matchesPctOfSongRange,
	pctOfSongFromCounts,
	pctOfSongFromGroupedResult,
	toPlainPctOfSongRange
} from "./pctOfSong.js";

const progressionOfLength = (length: number): ParsedProgressionChord[] =>
	Array.from(
		{ length: length },
		() => ({ display: "I" }) as ParsedProgressionChord
	);

const groupedResult = (
	sections: GroupedSongSearchResult["sections"]
): GroupedSongSearchResult => ({
	songKey: "song-a",
	title: "Test Song",
	artists: [],
	sections
});

describe("matchingChordCountFromMatches", () => {
	it("counts unique chord indices covered by overlapping matches", () => {
		expect(
			matchingChordCountFromMatches([
				{ start: 0, length: 2 },
				{ start: 1, length: 2 }
			])
		).toBe(3);
	});
});

describe("pctOfSongFromCounts", () => {
	it("returns zero when there are no chords", () => {
		expect(pctOfSongFromCounts(2, 0)).toBe(0);
	});

	it("returns the percentage of matching chords", () => {
		expect(pctOfSongFromCounts(2, 8)).toBe(25);
	});
});

describe("pctOfSongFromGroupedResult", () => {
	it("weights multiple sections with matches by total chord counts", () => {
		const result = groupedResult([
			{
				sectionLabel: "verse",
				parsedProgression: progressionOfLength(4),
				matches: [{ start: 0, length: 2 }]
			},
			{
				sectionLabel: "chorus",
				parsedProgression: progressionOfLength(6),
				matches: [{ start: 0, length: 3 }]
			},
			{
				sectionLabel: "bridge",
				parsedProgression: progressionOfLength(2),
				matches: []
			}
		]);

		expect(pctOfSongFromGroupedResult(result)).toBe(50);
	});
});

describe("toPlainPctOfSongRange", () => {
	it("returns a new plain tuple for worker postMessage", () => {
		const source = [10, 90] as const;
		const plain = toPlainPctOfSongRange(source);

		expect(plain).toEqual([10, 90]);
		expect(plain).not.toBe(source);
	});
});

describe("clampPctOfSongRange", () => {
	it("clamps values to the 0–100 domain and orders endpoints", () => {
		expect(clampPctOfSongRange([120, -5])).toEqual([0, 100]);
		expect(clampPctOfSongRange([80, 20])).toEqual([20, 80]);
	});
});

describe("matchesPctOfSongRange", () => {
	it("passes all percentages when no filter is set", () => {
		expect(matchesPctOfSongRange(42, null)).toBe(true);
		expect(matchesPctOfSongRange(0, undefined)).toBe(true);
	});

	it("includes percentages inside the inclusive range", () => {
		expect(matchesPctOfSongRange(25, [20, 30])).toBe(true);
		expect(matchesPctOfSongRange(20, [20, 30])).toBe(true);
		expect(matchesPctOfSongRange(30, [20, 30])).toBe(true);
		expect(matchesPctOfSongRange(19.9, [20, 30])).toBe(false);
	});
});
