import { describe, expect, it } from "vitest";
import { diatonicQualityForDegree, isNonDiatonicToken } from "./diatonicQuality.js";
import { SCALE_INTERVALS, type ScaleName } from "./scale-intervals.js";

describe("diatonicQualityForDegree", () => {
	it("matches standard major-scale triad qualities (I ii iii IV V vi vii°)", () => {
		const qualities = [1, 2, 3, 4, 5, 6, 7].map((d) =>
			diatonicQualityForDegree("major", d)
		);
		expect(qualities).toEqual(["maj", "min", "min", "maj", "maj", "min", "dim"]);
	});

	it("matches standard natural-minor triad qualities (i ii° III iv v VI VII)", () => {
		const qualities = [1, 2, 3, 4, 5, 6, 7].map((d) =>
			diatonicQualityForDegree("minor", d)
		);
		expect(qualities).toEqual(["min", "dim", "maj", "min", "min", "maj", "maj"]);
	});

	it("produces a valid triad quality for every degree of every known scale", () => {
		for (const scale of Object.keys(SCALE_INTERVALS) as ScaleName[]) {
			for (let degree = 1; degree <= 7; degree++) {
				expect(["maj", "min", "dim", "aug"]).toContain(
					diatonicQualityForDegree(scale, degree)
				);
			}
		}
	});
});

describe("isNonDiatonicToken", () => {
	it("does not flag diatonic major-key chords", () => {
		expect(isNonDiatonicToken("I", "major")).toBe(false);
		expect(isNonDiatonicToken("ii", "major")).toBe(false);
		expect(isNonDiatonicToken("V", "major")).toBe(false);
	});

	it("flags a minor iv as non-diatonic in a major key", () => {
		expect(isNonDiatonicToken("iv", "major")).toBe(true);
	});

	it("flags a minor v as non-diatonic in a major key", () => {
		expect(isNonDiatonicToken("v", "major")).toBe(true);
	});

	it("flags a major III as non-diatonic in a major key", () => {
		expect(isNonDiatonicToken("III", "major")).toBe(true);
	});

	it("does not flag the same qualities when they're diatonic in a minor key", () => {
		expect(isNonDiatonicToken("iv", "minor")).toBe(false);
		expect(isNonDiatonicToken("v", "minor")).toBe(false);
		expect(isNonDiatonicToken("III", "minor")).toBe(false);
	});

	it("flags an explicit accidental regardless of quality", () => {
		expect(isNonDiatonicToken("bVII", "major")).toBe(true);
		expect(isNonDiatonicToken("#IV", "major")).toBe(true);
	});

	it("returns false for an unparseable token", () => {
		expect(isNonDiatonicToken("???", "major")).toBe(false);
	});
});
