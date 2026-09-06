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

	it("prefers the written chord name over a snapped diatonic degree", () => {
		const snappedBugChord = {
			name: "Bb",
			degree: 2,
			quality: "maj",
			bass_degree: 2,
			borrowed: true,
			extension: null,
			suspensions: []
		};

		const input = chordToProgressionInput(snappedBugChord, "G", "major");
		expect(input?.noteName).toBe("Bb");
		expect(input?.noteName).not.toBe("A");
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

	it("does not invent a flat from the borrowed flag alone", () => {
		const borrowedMajorThree = {
			degree: 3,
			quality: "maj",
			borrowed: true,
			bass_degree: 3,
			extension: null,
			suspensions: []
		};

		expect(resolveAccidental(borrowedMajorThree, "G", "major")).toBe(0);
		expect(chordsToRomanTokens([borrowedMajorThree], "G", "major")).toEqual([
			"III"
		]);
	});

	it("keeps major III when roman/name are E, even if borrowed (buttercup)", () => {
		const buttercupThree = {
			name: "E7",
			degree: 3,
			quality: "maj",
			borrowed: true,
			roman: "III",
			bass_degree: 3,
			extension: null,
			suspensions: []
		};

		expect(resolveAccidental(buttercupThree, "C", "major")).toBe(0);
		expect(chordsToRomanTokens([buttercupThree], "C", "major")).toEqual([
			"III"
		]);
		expect(chordToProgressionInput(buttercupThree, "C", "major")).toEqual({
			noteName: "E",
			suffix: "major"
		});
	});

	it("keeps major III from the chord name when roman is absent", () => {
		const namedMajorThree = {
			name: "E7",
			degree: 3,
			quality: "maj",
			borrowed: true,
			bass_degree: 3,
			extension: null,
			suspensions: []
		};

		expect(resolveAccidental(namedMajorThree, "C", "major")).toBe(0);
		expect(chordsToRomanTokens([namedMajorThree], "C", "major")).toEqual([
			"III"
		]);
		expect(chordToProgressionInput(namedMajorThree, "C", "major")).toEqual({
			noteName: "E",
			suffix: "major"
		});
	});

	it("keeps major VI secondary dominant when roman/name are A, even if borrowed", () => {
		const aSeven = {
			name: "A7",
			degree: 6,
			quality: "maj",
			borrowed: true,
			roman: "VI",
			bass_degree: 6,
			extension: null,
			suspensions: []
		};

		expect(resolveAccidental(aSeven, "C", "major")).toBe(0);
		expect(chordsToRomanTokens([aSeven], "C", "major")).toEqual(["VI"]);
		expect(chordToProgressionInput(aSeven, "C", "major")).toEqual({
			noteName: "A",
			suffix: "major"
		});
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
