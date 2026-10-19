import { describe, expect, it } from "vitest";
import { CHORD_TEMPLATES } from "./chord-classifier/templates.js";
import { noteNameToPitchClass } from "./chord-classifier/notes.js";
import {
	diatonicChordOnBass,
	romanTokenForChord,
	type MusicalKey
} from "./chordInKey.js";
import { formatChordName, parseChordName } from "./formatChordDisplay.js";
import { romanTokensToProgressionInKey } from "./scales.js";

const A_MAJOR: MusicalKey = { tonic: "A", scale: "major" };
const E_MINOR: MusicalKey = { tonic: "E", scale: "minor" };

const chordFromInput = (input: { noteName: string; suffix: string }) => ({
	rootPitchClass: noteNameToPitchClass(input.noteName),
	suffix: input.suffix
});

describe("romanTokenForChord", () => {
	it("round-trips numerals through chords in a key", () => {
		const tokens = [
			"I",
			"ii",
			"iii",
			"IV",
			"V",
			"vi",
			"vii°",
			"bVII",
			"bIII",
			"V7",
			"IVmaj7",
			"ii7",
			"Isus4",
			"viim7b5",
			"IVadd9"
		];
		[A_MAJOR, { tonic: "Eb", scale: "major" } as MusicalKey].forEach((key) => {
			const chords = romanTokensToProgressionInKey(
				tokens,
				key.tonic,
				key.scale
			);
			expect(
				chords.map((chord) => romanTokenForChord(chordFromInput(chord), key))
			).toEqual(tokens);
		});
	});

	it("is relative to minor keys too", () => {
		const chords = romanTokensToProgressionInKey(
			["i", "III", "VI", "VII", "iv"],
			"E",
			"minor"
		);
		expect(
			chords.map((chord) => romanTokenForChord(chordFromInput(chord), E_MINOR))
		).toEqual(["i", "III", "VI", "VII", "iv"]);
	});

	it("writes a slash bass as a degree", () => {
		const dOverFSharp = parseChordName("D / F#")!;
		expect(romanTokenForChord(dOverFSharp, A_MAJOR)).toBe("IV/VI");
	});
});

describe("diatonicChordOnBass", () => {
	it("picks the chord that belongs on the note in the key", () => {
		const names = ["A", "F#", "D", "E", "G#", "C"].map((note) =>
			formatChordName(diatonicChordOnBass(noteNameToPitchClass(note), A_MAJOR))
		);
		expect(names).toEqual(["A", "F#m", "D", "E", "Ab diminished", "C"]);
	});
});

describe("parseChordName", () => {
	it("reads back every name formatChordName writes", () => {
		CHORD_TEMPLATES.forEach(({ suffix }) => {
			const chord = { rootPitchClass: 6, suffix };
			expect(parseChordName(formatChordName(chord))).toEqual(chord);
		});
		const slash = { rootPitchClass: 2, suffix: "major", bassPitchClass: 6 };
		expect(parseChordName(formatChordName(slash))).toEqual(slash);
	});

	it("rejects anything else", () => {
		expect(parseChordName("unknown")).toBeNull();
		expect(parseChordName("H7")).toBeNull();
	});
});
