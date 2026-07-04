import { describe, expect, it } from "vitest";
import { toPrecomputedAbstractProgression } from "./match-chord-progressions/match.js";
import {
	parseRomanToken,
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

// C major pitch classes: I=0, ii=2, iii=4, IV=5, V=7, vi=9, vii=11
describe("parseRomanToken — extensions", () => {
	it("parses plain triads unchanged", () => {
		expect(parseRomanToken("I")).toMatchObject({ degree: 1, suffix: "major" });
		expect(parseRomanToken("vi")).toMatchObject({ degree: 6, suffix: "minor" });
		expect(parseRomanToken("bVI")).toMatchObject({ degree: 6, flat: true, suffix: "major" });
		expect(parseRomanToken("vii°")).toMatchObject({ degree: 7, suffix: "diminished" });
	});

	it("parses major-quality extensions", () => {
		expect(parseRomanToken("IVmaj7")).toMatchObject({ degree: 4, suffix: "maj7" });
		expect(parseRomanToken("Imaj9")).toMatchObject({ degree: 1, suffix: "maj9" });
		expect(parseRomanToken("V7")).toMatchObject({ degree: 5, suffix: "7" });
		expect(parseRomanToken("IV9")).toMatchObject({ degree: 4, suffix: "9" });
		expect(parseRomanToken("Isus4")).toMatchObject({ degree: 1, suffix: "sus4" });
		expect(parseRomanToken("Isus2")).toMatchObject({ degree: 1, suffix: "sus2" });
		expect(parseRomanToken("I(add9)")).toMatchObject({ degree: 1, suffix: "add9" });
		expect(parseRomanToken("IV(add6)")).toMatchObject({ degree: 4, suffix: "6" });
	});

	it("parses minor-quality extensions", () => {
		expect(parseRomanToken("ii7")).toMatchObject({ degree: 2, suffix: "minor7" });
		expect(parseRomanToken("iii7")).toMatchObject({ degree: 3, suffix: "minor7" });
		expect(parseRomanToken("vi7")).toMatchObject({ degree: 6, suffix: "minor7" });
		expect(parseRomanToken("vi9")).toMatchObject({ degree: 6, suffix: "minor9" });
		expect(parseRomanToken("iim7")).toMatchObject({ degree: 2, suffix: "minor7" });
	});

	it("strips slash annotations and returns the root chord", () => {
		expect(parseRomanToken("IV/V")).toMatchObject({ degree: 4, suffix: "major" });
		expect(parseRomanToken("I/3")).toMatchObject({ degree: 1, suffix: "major" });
		expect(parseRomanToken("IVmaj7/3")).toMatchObject({ degree: 4, suffix: "maj7" });
		expect(parseRomanToken("vi/V/3")).toMatchObject({ degree: 6, suffix: "minor" });
	});

	it("strips outer parentheses (borrowed chords)", () => {
		expect(parseRomanToken("(IV)")).toMatchObject({ degree: 4, suffix: "major" });
		expect(parseRomanToken("(ii)")).toMatchObject({ degree: 2, suffix: "minor" });
	});

	it("romanTokensToParsedProgression produces correct pitch classes in C major", () => {
		const parsed = romanTokensToParsedProgression(["IVmaj7", "ii7", "iii7", "IV"]);
		expect(parsed).not.toBeNull();
		expect(parsed!.map((c) => c.rootPitchClass)).toEqual([5, 2, 4, 5]);
		expect(parsed!.map((c) => c.suffix)).toEqual(["maj7", "minor7", "minor7", "major"]);
	});

	it("romanTokensToPrecomputedAbstract still agrees with toPrecomputedAbstractProgression for extended tokens", () => {
		const tokens = ["IVmaj7", "ii7", "V7", "I"];
		const parsed = romanTokensToParsedProgression(tokens);
		const abstract = romanTokensToPrecomputedAbstract(tokens);
		expect(parsed).not.toBeNull();
		expect(abstract).not.toBeNull();
		expect(toPrecomputedAbstractProgression(parsed!)).toEqual(abstract);
	});
});
