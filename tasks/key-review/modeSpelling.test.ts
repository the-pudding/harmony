import { describe, expect, it } from "vitest";
import { respellRomanToken, spellIntervalInScale } from "./modeSpelling.js";

const MINOR_THIRD = 3;
const MAJOR_THIRD = 4;
const TRITONE = 6;
const MINOR_SEVENTH = 10;
const MAJOR_SEVENTH = 11;

describe("spellIntervalInScale", () => {
	it("spells diatonic intervals as plain degrees", () => {
		expect(spellIntervalInScale(MINOR_SEVENTH, "mixolydian")).toEqual({
			degree: 7,
			accidental: 0
		});
	});

	it("follows the corpus conventions for chromatic notes", () => {
		expect(spellIntervalInScale(MINOR_SEVENTH, "major")).toEqual({
			degree: 7,
			accidental: -1
		});
		expect(spellIntervalInScale(TRITONE, "major")).toEqual({
			degree: 5,
			accidental: -1
		});
		expect(spellIntervalInScale(MAJOR_THIRD, "minor")).toEqual({
			degree: 3,
			accidental: 1
		});
		expect(spellIntervalInScale(MAJOR_SEVENTH, "mixolydian")).toEqual({
			degree: 7,
			accidental: 1
		});
		expect(spellIntervalInScale(MINOR_THIRD, "mixolydian")).toEqual({
			degree: 3,
			accidental: -1
		});
		expect(spellIntervalInScale(MAJOR_THIRD, "dorian")).toEqual({
			degree: 3,
			accidental: 1
		});
	});
});

describe("respellRomanToken", () => {
	const relativeMinorContext = (rootIntervalFromNewTonic: number) => ({
		rootIntervalFromNewTonic,
		fromScale: "major",
		toScale: "minor",
		tonicShift: -MINOR_THIRD
	});

	it("respells the numeral and keeps case and extensions", () => {
		expect(respellRomanToken("IVmaj7", relativeMinorContext(8))).toBe("VImaj7");
		expect(respellRomanToken("vi7/3", relativeMinorContext(0))).toBe("i7/3");
		expect(respellRomanToken("V(add9)", relativeMinorContext(10))).toBe(
			"VII(add9)"
		);
	});

	it("respells only the target of applied chords", () => {
		expect(respellRomanToken("V/V", relativeMinorContext(5))).toBe("V/VII");
	});
});
