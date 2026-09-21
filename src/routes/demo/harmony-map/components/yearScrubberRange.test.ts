import { describe, expect, it } from "vitest";
import {
	shiftYearRangeWithinBounds,
	yearDeltaFromPointerMove
} from "./yearScrubberRange.js";

const bounds = { min: 1950, max: 2000 };

describe("shiftYearRangeWithinBounds", () => {
	it("shifts both ends by the same delta", () => {
		expect(
			shiftYearRangeWithinBounds({ min: 1960, max: 1970 }, 5, bounds)
		).toEqual({ min: 1965, max: 1975 });
	});

	it("clamps against the lower bound without changing span", () => {
		expect(
			shiftYearRangeWithinBounds({ min: 1952, max: 1962 }, -10, bounds)
		).toEqual({ min: 1950, max: 1960 });
	});

	it("clamps against the upper bound without changing span", () => {
		expect(
			shiftYearRangeWithinBounds({ min: 1988, max: 1998 }, 10, bounds)
		).toEqual({ min: 1990, max: 2000 });
	});
});

describe("yearDeltaFromPointerMove", () => {
	it("maps pointer pixels onto rounded year steps", () => {
		expect(yearDeltaFromPointerMove(20, 100, bounds)).toBe(10);
		expect(yearDeltaFromPointerMove(0, 100, bounds)).toBe(0);
		expect(yearDeltaFromPointerMove(10, 0, bounds)).toBe(0);
	});
});
