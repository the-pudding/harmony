import { describe, expect, it } from "vitest";
import { jitterFor } from "$components/hexmap/components/scatter/normalizePoints.js";
import { hashUnit } from "./seededRandom.js";

describe("hashUnit", () => {
	it("is in [0, 1) and deterministic", () => {
		for (const key of ["a", "journey-dont-stop-believin", "", "ü"]) {
			const value = hashUnit(key, "x");
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
			expect(hashUnit(key, "x")).toBe(value);
		}
	});

	it("differs by salt and by key", () => {
		expect(hashUnit("a", "x")).not.toBe(hashUnit("a", "y"));
		expect(hashUnit("a", "x")).not.toBe(hashUnit("b", "x"));
	});

	it("is roughly uniform", () => {
		const values = Array.from({ length: 5000 }, (_, i) =>
			hashUnit(`k${i}`, "u")
		);
		const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
		expect(mean).toBeGreaterThan(0.48);
		expect(mean).toBeLessThan(0.52);
		const lowHalf = values.filter((v) => v < 0.5).length;
		expect(lowHalf).toBeGreaterThan(2400);
		expect(lowHalf).toBeLessThan(2600);
	});

	it("pins known values so layouts never shift", () => {
		expect(hashUnit("a", "x")).toBeCloseTo(PINNED.a, 12);
		expect(hashUnit("journey-dont-stop-believin", "y")).toBeCloseTo(
			PINNED.journey,
			12
		);
	});
});

// jitterFor keeps its original hash (a different one from hashUnit's) so the
// UMAP map doesn't move; pin its output.
describe("jitterFor", () => {
	it("keeps its exact current output", () => {
		expect(jitterFor("a")).toEqual(PINNED_JITTER.a);
		expect(jitterFor("journey-dont-stop-believin")).toEqual(
			PINNED_JITTER.journey
		);
		expect(jitterFor("")).toEqual(PINNED_JITTER.empty);
	});
});

const PINNED = { a: 0.6127887251786888, journey: 0.6484962252434343 };
const PINNED_JITTER = {
	a: { nx: -0.0031200000000000004, ny: -0.003751287128712871 },
	journey: { nx: 0.0020800000000000003, ny: 0.0015801980198019824 },
	empty: { nx: -0.00344, ny: -0.003994455445544554 }
};
