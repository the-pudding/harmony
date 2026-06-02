import { describe, expect, it } from "vitest";
import { toPrecomputedAbstractProgression } from "./match-chord-progressions/match.js";
import {
	romanTokensToParsedProgression,
	romanTokensToPrecomputedAbstract
} from "./romanNumerals.js";

describe("romanTokensToParsedProgression", () => {
	it("matches romanTokensToPrecomputedAbstract for a common progression", () => {
		const tokens = ["I", "V", "vi", "IV"];
		const parsed = romanTokensToParsedProgression(tokens);
		const fromRoman = romanTokensToPrecomputedAbstract(tokens);

		expect(parsed).not.toBeNull();
		expect(fromRoman).not.toBeNull();
		expect(toPrecomputedAbstractProgression(parsed!)).toEqual(fromRoman);
	});

	it("returns null for invalid tokens", () => {
		expect(romanTokensToParsedProgression(["I", "not-a-chord"])).toBeNull();
	});
});
