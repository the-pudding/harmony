import { describe, expect, it } from "vitest";
import {
	hasConsecutivelyRepeatedBlock,
	isSelfRepeatingProgression,
	MIN_PROGRESSION_LENGTH,
	MAX_PROGRESSION_LENGTH
} from "./progressionConstraints.js";

describe("hasConsecutivelyRepeatedBlock", () => {
	it("rejects a progression that is its own unit repeated twice", () => {
		expect(
			hasConsecutivelyRepeatedBlock([
				"I",
				"vi",
				"iii",
				"V",
				"I",
				"vi",
				"iii",
				"V"
			])
		).toBe(true);
	});

	it("rejects a 8-chord progression that repeats a 4-chord block", () => {
		expect(
			hasConsecutivelyRepeatedBlock([
				"IV",
				"V",
				"IV",
				"V",
				"IV",
				"V",
				"IV",
				"V"
			])
		).toBe(true);
	});

	it("rejects an internal consecutive repeat (not starting at index 0)", () => {
		expect(
			hasConsecutivelyRepeatedBlock([
				"ii",
				"I",
				"vi",
				"iii",
				"V",
				"I",
				"vi",
				"iii",
				"V"
			])
		).toBe(true);
	});

	it("rejects a 6-chord progression with a 3-chord block repeated", () => {
		expect(
			hasConsecutivelyRepeatedBlock(["I", "IV", "V", "I", "IV", "V"])
		).toBe(true);
	});

	it("allows a 4-chord progression that only repeats a 2-chord block (below minimum)", () => {
		expect(hasConsecutivelyRepeatedBlock(["IV", "V", "IV", "V"])).toBe(false);
	});

	it("allows a 4-chord progression with no repeating blocks", () => {
		expect(hasConsecutivelyRepeatedBlock(["I", "vi", "iii", "V"])).toBe(false);
	});

	it("allows a real core progression with period-2 pattern (I-IV-I-IV)", () => {
		expect(hasConsecutivelyRepeatedBlock(["I", "IV", "I", "IV"])).toBe(false);
	});

	it("allows a real core progression with period-2 pattern (I-V-I-V)", () => {
		expect(hasConsecutivelyRepeatedBlock(["I", "V", "I", "V"])).toBe(false);
	});

	it("allows a longer core progression with no repeating block", () => {
		expect(
			hasConsecutivelyRepeatedBlock([
				"I",
				"V",
				"vi",
				"iii",
				"IV",
				"I",
				"IV",
				"V"
			])
		).toBe(false);
	});

	it("allows a 3-chord progression (minimum length, no room for a 3-block repeat)", () => {
		expect(hasConsecutivelyRepeatedBlock(["I", "IV", "V"])).toBe(false);
	});

	it("respects a custom minBlockLength: allows with minBlockLength=4 what it rejects with 3", () => {
		const tokens = ["I", "IV", "V", "I", "IV", "V"];
		expect(hasConsecutivelyRepeatedBlock(tokens, 3)).toBe(true);
		expect(hasConsecutivelyRepeatedBlock(tokens, 4)).toBe(false);
	});

	it("uses MIN_PROGRESSION_LENGTH as the default minimum block length", () => {
		const twoChordRepeat = ["IV", "V", "IV", "V"];
		expect(hasConsecutivelyRepeatedBlock(twoChordRepeat)).toBe(false);
		expect(MIN_PROGRESSION_LENGTH).toBe(3);
	});

	it("keeps the maximum progression length at or above the minimum", () => {
		expect(MAX_PROGRESSION_LENGTH).toBeGreaterThanOrEqual(
			MIN_PROGRESSION_LENGTH
		);
	});
});

describe("isSelfRepeatingProgression", () => {
	it("rejects the the-weeknd pattern doubled", () => {
		expect(isSelfRepeatingProgression("I-vi-iii-V-I-vi-iii-V")).toBe(true);
	});

	it("rejects the IV-V vamp repeated four times", () => {
		expect(isSelfRepeatingProgression("IV-V-IV-V-IV-V-IV-V")).toBe(true);
	});

	it("allows the the-weeknd pattern un-doubled", () => {
		expect(isSelfRepeatingProgression("I-vi-iii-V")).toBe(false);
	});

	it("allows the IV-V vamp (only a 2-chord repeat, below minimum)", () => {
		expect(isSelfRepeatingProgression("IV-V-IV-V")).toBe(false);
	});

	it("allows the axis of awesome (I-V-vi-IV)", () => {
		expect(isSelfRepeatingProgression("I-V-vi-IV")).toBe(false);
	});

	it("allows the doo wop progression (I-vi-IV-V)", () => {
		expect(isSelfRepeatingProgression("I-vi-IV-V")).toBe(false);
	});

	it("allows the pachelbel canon (long but non-repeating internally)", () => {
		expect(isSelfRepeatingProgression("I-V-vi-iii-IV-I-IV-V")).toBe(false);
	});
});
