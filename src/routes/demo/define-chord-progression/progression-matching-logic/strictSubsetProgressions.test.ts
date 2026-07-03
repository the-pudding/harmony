import { describe, expect, it } from "vitest";
import {
	isContiguousRun,
	findStrictSubsetKeys,
	applySubsetFlag
} from "./strictSubsetProgressions.js";
import type { ProgressionWithMatchStats } from "./progressionMatchAnalysis.js";

const makeFakeMatch = (
	chordProgression: string,
	coveragePercent: number,
	isCoreProgression = false
): ProgressionWithMatchStats => ({
	name: "",
	chordProgression,
	description: "",
	matchCount: 2,
	coveragePercent,
	isCoreProgression,
	highlightPalette: { fill: "#000", border: "#fff" }
});

describe("isContiguousRun", () => {
	it("finds a run at the start", () => {
		expect(isContiguousRun(["I", "V", "vi"], ["I", "V", "vi", "IV"])).toBe(true);
	});

	it("finds a run at the end", () => {
		expect(isContiguousRun(["vi", "IV"], ["I", "V", "vi", "IV"])).toBe(true);
	});

	it("finds a run in the middle", () => {
		expect(isContiguousRun(["V", "vi"], ["I", "V", "vi", "IV"])).toBe(true);
	});

	it("returns false for equal-length sequences", () => {
		expect(isContiguousRun(["I", "V", "vi", "IV"], ["I", "V", "vi", "IV"])).toBe(false);
	});

	it("returns false when the shorter is not a contiguous substring", () => {
		expect(isContiguousRun(["I", "IV"], ["I", "V", "vi", "IV"])).toBe(false);
	});

	it("returns false when longer is actually shorter", () => {
		expect(isContiguousRun(["I", "V", "vi", "IV"], ["I", "V"])).toBe(false);
	});

	it("finds a 3-chord run inside a 5-chord progression", () => {
		expect(isContiguousRun(["ii", "V", "I"], ["I", "ii", "V", "I", "vi"])).toBe(true);
	});
});

describe("findStrictSubsetKeys", () => {
	it("flags a progression that is a contiguous sub-run of a higher-coverage one", () => {
		const matches = [
			makeFakeMatch("I-V-vi-IV", 40, false),
			makeFakeMatch("I-V-vi", 20, false)
		];
		const keys = findStrictSubsetKeys(matches);
		expect(keys.has("I-V-vi")).toBe(true);
		expect(keys.has("I-V-vi-IV")).toBe(false);
	});

	it("does not flag when coverage is equal", () => {
		const matches = [
			makeFakeMatch("I-V-vi-IV", 20, false),
			makeFakeMatch("I-V-vi", 20, false)
		];
		expect(findStrictSubsetKeys(matches).has("I-V-vi")).toBe(false);
	});

	it("does not flag when subset has higher coverage than superset", () => {
		const matches = [
			makeFakeMatch("I-V-vi-IV", 20, false),
			makeFakeMatch("I-V-vi", 40, false)
		];
		expect(findStrictSubsetKeys(matches).has("I-V-vi")).toBe(false);
	});

	it("does not flag when sub-sequence is not contiguous", () => {
		const matches = [
			makeFakeMatch("I-vi-IV", 40, false),
			makeFakeMatch("I-V-vi", 20, false)
		];
		expect(findStrictSubsetKeys(matches).has("I-V-vi")).toBe(false);
	});

	it("flags a core progression if it is also a strict subset", () => {
		const matches = [
			makeFakeMatch("I-V-vi-IV", 40, false),
			makeFakeMatch("I-V-vi", 20, true)
		];
		expect(findStrictSubsetKeys(matches).has("I-V-vi")).toBe(true);
	});

	it("returns empty set when no subsets exist", () => {
		const matches = [
			makeFakeMatch("I-V-vi-IV", 40, false),
			makeFakeMatch("ii-V-I", 30, false)
		];
		expect(findStrictSubsetKeys(matches).size).toBe(0);
	});
});

describe("applySubsetFlag", () => {
	it("sets isStrictSubset true for flagged keys and false for others", () => {
		const matches = [
			makeFakeMatch("I-V-vi-IV", 40),
			makeFakeMatch("I-V-vi", 20)
		];
		const keys = new Set(["I-V-vi"]);
		const result = applySubsetFlag(matches, keys);
		expect(result[0].isStrictSubset).toBe(false);
		expect(result[1].isStrictSubset).toBe(true);
	});

	it("does not mutate the original matches", () => {
		const matches = [makeFakeMatch("I-V-vi", 20)];
		const keys = new Set(["I-V-vi"]);
		applySubsetFlag(matches, keys);
		expect((matches[0] as ProgressionWithMatchStats & { isStrictSubset?: boolean }).isStrictSubset).toBeUndefined();
	});

	it("preserves all other fields", () => {
		const match = makeFakeMatch("I-V-vi", 20, true);
		const result = applySubsetFlag([match], new Set(["I-V-vi"]));
		expect(result[0].isCoreProgression).toBe(true);
		expect(result[0].coveragePercent).toBe(20);
	});
});
