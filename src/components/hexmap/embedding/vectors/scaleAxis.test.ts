import { describe, expect, it } from "vitest";
import { computeMajornessScore } from "./scaleAxis.js";

describe("computeMajornessScore", () => {
	it("returns 1 for an entirely major song", () => {
		const score = computeMajornessScore({
			sections: [{ scale: "major", romanTokens: ["I", "IV", "V"] }]
		});
		expect(score).toBe(1);
	});

	it("returns -1 for an entirely minor song", () => {
		const score = computeMajornessScore({
			sections: [{ scale: "minor", romanTokens: ["i", "VI", "III"] }]
		});
		expect(score).toBe(-1);
	});

	it("returns 0 for an evenly split song", () => {
		const score = computeMajornessScore({
			sections: [
				{ scale: "major", romanTokens: ["I", "IV"] },
				{ scale: "minor", romanTokens: ["i", "iv"] }
			]
		});
		expect(score).toBe(0);
	});

	it("weights by chord count, not section count", () => {
		const score = computeMajornessScore({
			sections: [
				{ scale: "major", romanTokens: ["I", "IV", "V", "I"] },
				{ scale: "minor", romanTokens: ["i"] }
			]
		});
		expect(score).toBeCloseTo(3 / 5);
	});

	it("dilutes toward 0 for modal sections without pushing either direction", () => {
		const score = computeMajornessScore({
			sections: [
				{ scale: "major", romanTokens: ["I", "IV"] },
				{ scale: "dorian", romanTokens: ["i", "IV", "v"] }
			]
		});
		expect(score).toBeCloseTo(2 / 5);
	});

	it("returns 0 for a song with no sections", () => {
		expect(computeMajornessScore({ sections: [] })).toBe(0);
	});
});
