import { describe, expect, it } from "vitest";
import {
	chordToProgressionInput,
	chordsToRomanTokens,
	degreeQualityToRoman,
	degreeToPitchClass,
	resolveAccidental
} from "./build-songs.js";

describe("build-songs chromatic regression", () => {
	it("emits bIII tokens and Bb pitch for Magic-style bIII in G major", () => {
		const chord = {
			name: "Bb",
			degree: 3,
			accidental: -1,
			quality: "maj",
			bass_degree: 3,
			borrowed: true,
			extension: null,
			suspensions: []
		};

		expect(degreeQualityToRoman(3, "maj", -1)).toBe("bIII");
		expect(chordsToRomanTokens([chord], "G", "major")).toEqual(["bIII"]);
		expect(degreeToPitchClass(3, "G", "major", -1)).toBe(10);

		const input = chordToProgressionInput(chord, "G", "major");
		expect(input).toEqual({ noteName: "Bb", suffix: "major" });
	});

	it("does not map bIII to diatonic A (the old snap bug)", () => {
		const snappedBugChord = {
			name: "Bb",
			degree: 2,
			quality: "maj",
			bass_degree: 2,
			borrowed: true,
			extension: null,
			suspensions: []
		};

		const wrongInput = chordToProgressionInput(snappedBugChord, "G", "major");
		expect(wrongInput?.noteName).toBe("A");
		expect(wrongInput?.noteName).not.toBe("Bb");
	});

	it("parses C/Bb slash bass from the chord name", () => {
		const slashChord = {
			name: "C/Bb",
			degree: 4,
			quality: "maj",
			bass_degree: 3,
			borrowed: false,
			extension: null,
			suspensions: []
		};

		expect(chordToProgressionInput(slashChord, "G", "major")).toEqual({
			noteName: "C",
			suffix: "major",
			bassNoteName: "Bb"
		});
	});

	it("derives bIII from HookTheory borrowed flag when accidental is absent", () => {
		const borrowedMajorThree = {
			degree: 3,
			quality: "maj",
			borrowed: true,
			bass_degree: 3,
			extension: null,
			suspensions: []
		};

		expect(resolveAccidental(borrowedMajorThree, "G", "major")).toBe(-1);
		expect(chordsToRomanTokens([borrowedMajorThree], "G", "major")).toEqual([
			"bIII"
		]);
		expect(degreeToPitchClass(3, "G", "major", -1)).toBe(10);
	});

	it("maps major-key flat sevenths to bVII not VI", () => {
		const fMajor = {
			name: "F",
			degree: 7,
			accidental: -1,
			quality: "maj",
			bass_degree: 7,
			borrowed: true,
			extension: null,
			suspensions: []
		};

		expect(chordsToRomanTokens([fMajor], "G", "major")).toEqual(["bVII"]);
		expect(chordToProgressionInput(fMajor, "G", "major")).toEqual({
			noteName: "F",
			suffix: "major"
		});
	});
});
