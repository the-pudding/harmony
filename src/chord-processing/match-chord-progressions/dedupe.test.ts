import { describe, expect, it } from "vitest";
import { noteNameToPitchClass } from "../chord-classifier/notes.js";
import {
	dedupeAdjacentParsedProgression,
	dedupeAdjacentProgressionInputs,
	progressionChordInputsAreEqual
} from "./dedupe.js";
import {
	findSubProgressionMatchesPrecomputed,
	toPrecomputedAbstractProgression
} from "./match.js";
import type { ParsedProgressionChord } from "../types.js";

const parsedChord = (
	noteName: string,
	suffix: string,
	display: string
): ParsedProgressionChord => ({
	rootPitchClass: noteNameToPitchClass(noteName),
	suffix,
	display
});

describe("dedupeAdjacentProgressionInputs", () => {
	it("collapses adjacent identical chords", () => {
		const input = [
			{ noteName: "C", suffix: "major" },
			{ noteName: "F", suffix: "major" },
			{ noteName: "F", suffix: "major" },
			{ noteName: "D", suffix: "major" }
		];
		expect(dedupeAdjacentProgressionInputs(input)).toEqual([
			{ noteName: "C", suffix: "major" },
			{ noteName: "F", suffix: "major" },
			{ noteName: "D", suffix: "major" }
		]);
	});

	it("does not collapse different qualities", () => {
		const input = [
			{ noteName: "C", suffix: "major" },
			{ noteName: "C", suffix: "maj7" }
		];
		expect(dedupeAdjacentProgressionInputs(input)).toEqual(input);
	});

	it("treats slash bass as part of identity", () => {
		expect(
			progressionChordInputsAreEqual(
				{ noteName: "C", suffix: "major" },
				{ noteName: "C", suffix: "major", bassNoteName: "G" }
			)
		).toBe(false);
	});
});

describe("dedupeAdjacentParsedProgression", () => {
	it("allows C F D search to match collapsed C F F D song", () => {
		const song = dedupeAdjacentParsedProgression([
			parsedChord("C", "major", "C"),
			parsedChord("F", "major", "F"),
			parsedChord("F", "major", "F"),
			parsedChord("D", "major", "D")
		]);
		const search = [
			parsedChord("C", "major", "C"),
			parsedChord("F", "major", "F"),
			parsedChord("D", "major", "D")
		];
		const matches = findSubProgressionMatchesPrecomputed(
			toPrecomputedAbstractProgression(song),
			search
		);
		expect(matches).toEqual([{ start: 0, length: 3 }]);
	});

	it("does not match a longer search through a single repeated chord", () => {
		const song = dedupeAdjacentParsedProgression([
			parsedChord("C", "major", "C"),
			parsedChord("F", "major", "F"),
			parsedChord("F", "major", "F"),
			parsedChord("D", "major", "D")
		]);
		const search = [
			parsedChord("C", "major", "C"),
			parsedChord("F", "major", "F"),
			parsedChord("F", "major", "F")
		];
		const matches = findSubProgressionMatchesPrecomputed(
			toPrecomputedAbstractProgression(song),
			search
		);
		expect(matches).toEqual([]);
	});
});
