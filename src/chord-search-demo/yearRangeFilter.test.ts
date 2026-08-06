import { describe, expect, it } from "vitest";
import { matchSongResultsChunk } from "./matchSongResultsChunk.js";
import {
	matchesYearRange,
	toPlainYearRange,
	type YearRangeFilter
} from "./yearRangeFilter.js";

describe("toPlainYearRange", () => {
	it("returns a new plain tuple for worker postMessage", () => {
		const source: YearRangeFilter = [2010, 2020];
		const plain = toPlainYearRange(source);

		expect(plain).toEqual([2010, 2020]);
		expect(plain).not.toBe(source);
	});
});

describe("matchesYearRange", () => {
	it("passes all years when no filter is set", () => {
		expect(matchesYearRange(1999, null)).toBe(true);
		expect(matchesYearRange(undefined, undefined)).toBe(true);
	});

	it("excludes songs without a year when a filter is active", () => {
		expect(matchesYearRange(undefined, [2000, 2010])).toBe(false);
	});

	it("includes years inside the inclusive range", () => {
		expect(matchesYearRange(2005, [2000, 2010])).toBe(true);
		expect(matchesYearRange(2000, [2000, 2010])).toBe(true);
		expect(matchesYearRange(2010, [2000, 2010])).toBe(true);
		expect(matchesYearRange(1999, [2000, 2010])).toBe(false);
	});

	it("includes fractional years within the calendar-year range", () => {
		expect(matchesYearRange(2010.999, [2000, 2010])).toBe(true);
		expect(matchesYearRange(2011, [2000, 2010])).toBe(false);
		expect(matchesYearRange(1999.9, [2000, 2010])).toBe(false);
	});
});

describe("matchSongResultsChunk year filter", () => {
	const chunk = [
		{
			id: "a",
			songKey: "k1",
			titleLower: "older",
			artists: [],
			year: 2015,
			suffixes: [],
			deltas: [],
			bassIntervals: [],
			wrapDelta: 0
		},
		{
			id: "b",
			songKey: "k2",
			titleLower: "newer",
			artists: [],
			year: 2020,
			suffixes: [],
			deltas: [],
			bassIntervals: [],
			wrapDelta: 0
		}
	];

	const baseFilters = {
		hasSearchChords: false,
		titleFilter: "",
		selectedArtist: "",
		fuzzySearch: false,
		matchAtBeginningOnly: false,
		matchAtLeastTwice: false
	};

	it("limits matched songs to the selected year range", () => {
		const partial = matchSongResultsChunk(
			chunk,
			{ ...baseFilters, yearRange: [2018, 2022] },
			null
		);

		expect(partial.matchedSongKeys).toEqual(["k2"]);
	});
});
