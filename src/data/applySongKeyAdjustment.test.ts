import { describe, expect, it } from "vitest";
import {
	applySongKeyAdjustment,
	reinterpretRomanTokensForKey
} from "./applySongKeyAdjustment.js";
import type { SongInput } from "../chord-processing/types.js";

describe("reinterpretRomanTokensForKey", () => {
	it("reinterprets D-major romans as G-major when absolute pitches stay put", () => {
		expect(
			reinterpretRomanTokensForKey(
				["IV", "VI", "II", "V", "I", "V", "I", "IV"],
				"D",
				"G",
				"major"
			)
		).toEqual(["I", "III", "VI", "II", "V", "II", "V", "I"]);
	});

	it("reinterprets borrowed flats into the nearest degree in the new key", () => {
		expect(
			reinterpretRomanTokensForKey(["bVII", "IV", "V", "I"], "D", "G", "major")
		).toEqual(["IV", "I", "II", "V"]);
	});
});

describe("applySongKeyAdjustment", () => {
	const chorusInWrongD: SongInput = {
		id: "connie-francis__many-tears-ago__chorus",
		songKey: "connie-francis__many-tears-ago",
		title: "Many Tears Ago (Chorus)",
		artists: ["Connie Francis"],
		key: "D",
		scale: "major",
		romanTokens: ["IV", "VI", "II", "V", "I", "V", "I", "IV"],
		progression: [
			{ noteName: "G", suffix: "major" },
			{ noteName: "B", suffix: "major" },
			{ noteName: "E", suffix: "major" },
			{ noteName: "A", suffix: "major" },
			{ noteName: "D", suffix: "major" },
			{ noteName: "A", suffix: "major" },
			{ noteName: "D", suffix: "major" },
			{ noteName: "G", suffix: "major" }
		],
		suffixes: [
			"major",
			"major",
			"major",
			"major",
			"major",
			"major",
			"major",
			"major"
		],
		deltas: [4, 5, 5, 5, 7, 5, 5],
		bassIntervals: [null, null, null, null, null, null, null, null],
		wrapDelta: 0
	};

	it("fixes relative key then transpose to Ab without rewriting sections", () => {
		const adjusted = applySongKeyAdjustment(chorusInWrongD, {
			chordsRelativeToKey: "G",
			transposeToKey: "Ab"
		});

		expect(adjusted.key).toBe("Ab");
		expect(adjusted.scale).toBe("major");
		expect(adjusted.romanTokens).toEqual([
			"I",
			"III",
			"VI",
			"II",
			"V",
			"II",
			"V",
			"I"
		]);
		expect(adjusted.progression.map((chord) => chord.noteName)).toEqual([
			"Ab",
			"C",
			"F",
			"Bb",
			"Eb",
			"Bb",
			"Eb",
			"Ab"
		]);
		expect(adjusted).not.toHaveProperty("suffixes");
		expect(adjusted).not.toHaveProperty("deltas");
	});
});
