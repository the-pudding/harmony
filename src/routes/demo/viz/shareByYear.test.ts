import { describe, expect, it } from "vitest";
import { computeShareByYear } from "./shareByYear.js";

describe("computeShareByYear", () => {
	it("returns an empty array for no items", () => {
		expect(computeShareByYear([])).toEqual([]);
	});

	it("computes the matched share per year", () => {
		const points = computeShareByYear([
			{ year: 1990, matched: true },
			{ year: 1990, matched: true },
			{ year: 1990, matched: false },
			{ year: 1990, matched: false }
		]);
		expect(points).toEqual([
			{ year: 1990, matchedCount: 2, totalCount: 4, sharePercent: 50 }
		]);
	});

	it("returns 0% for a year with no matches", () => {
		const points = computeShareByYear([
			{ year: 2000, matched: false },
			{ year: 2000, matched: false }
		]);
		expect(points).toEqual([
			{ year: 2000, matchedCount: 0, totalCount: 2, sharePercent: 0 }
		]);
	});

	it("returns 100% for a year where everything matches", () => {
		const points = computeShareByYear([{ year: 2010, matched: true }]);
		expect(points).toEqual([
			{ year: 2010, matchedCount: 1, totalCount: 1, sharePercent: 100 }
		]);
	});

	it("sorts distinct years ascending regardless of input order", () => {
		const points = computeShareByYear([
			{ year: 2005, matched: true },
			{ year: 1995, matched: false },
			{ year: 2000, matched: true }
		]);
		expect(points.map((p) => p.year)).toEqual([1995, 2000, 2005]);
	});
});
