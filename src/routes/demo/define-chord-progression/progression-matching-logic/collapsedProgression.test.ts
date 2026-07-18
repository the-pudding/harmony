import { describe, expect, it } from "vitest";
import type { ParsedProgressionChord } from "../../../../chord-processing/types.js";
import {
	collapseAdjacentCanonical,
	collapsedMatchToOriginalMatch,
	toBaseTriadSuffix,
	toCanonicalMatchingChord
} from "./collapsedProgression.js";

const chord = (
	rootPitchClass: number,
	suffix: string,
	bassPitchClass?: number
): ParsedProgressionChord => ({
	rootPitchClass,
	suffix,
	...(bassPitchClass !== undefined ? { bassPitchClass } : {}),
	display: ""
});

// C major reference chords used across the suite.
const I = chord(0, "major");
const I_SUS2 = chord(0, "sus2");
const I_MAJ7 = chord(0, "maj7");
const V = chord(7, "major");
const V_SUS4 = chord(7, "sus4");
const V7 = chord(7, "7");
const VI = chord(9, "minor");
const VI7 = chord(9, "minor7");
const IV = chord(5, "major");

describe("toBaseTriadSuffix", () => {
	it("folds suspensions and added tones down to major", () => {
		for (const suffix of [
			"sus2",
			"sus4",
			"add9",
			"6",
			"maj7",
			"maj9",
			"7sus4"
		]) {
			expect(toBaseTriadSuffix(suffix)).toBe("major");
		}
	});

	it("folds dominant sevenths and ninths down to major", () => {
		expect(toBaseTriadSuffix("7")).toBe("major");
		expect(toBaseTriadSuffix("9")).toBe("major");
	});

	it("folds minor voicings down to minor", () => {
		for (const suffix of ["minor", "minor7", "minor9"]) {
			expect(toBaseTriadSuffix(suffix)).toBe("minor");
		}
	});

	it("folds diminished voicings down to diminished", () => {
		for (const suffix of ["diminished", "dim7", "m7b5"]) {
			expect(toBaseTriadSuffix(suffix)).toBe("diminished");
		}
	});

	it("leaves base triad qualities untouched", () => {
		expect(toBaseTriadSuffix("major")).toBe("major");
		expect(toBaseTriadSuffix("minor")).toBe("minor");
		expect(toBaseTriadSuffix("augmented")).toBe("augmented");
	});
});

describe("toCanonicalMatchingChord", () => {
	it("drops slash bass and reduces the voicing to its base triad", () => {
		const canonical = toCanonicalMatchingChord(chord(7, "7", 11));
		expect(canonical).toEqual({
			rootPitchClass: 7,
			suffix: "major",
			display: ""
		});
		expect("bassPitchClass" in canonical).toBe(false);
	});
});

describe("collapseAdjacentCanonical", () => {
	it("merges runs of chords that are identical once extensions are ignored", () => {
		const { chords, originalRanges } = collapseAdjacentCanonical([
			I,
			I_SUS2,
			V,
			V_SUS4,
			VI,
			IV
		]);
		expect(chords.map((c) => [c.rootPitchClass, c.suffix])).toEqual([
			[0, "major"],
			[7, "major"],
			[9, "minor"],
			[5, "major"]
		]);
		expect(originalRanges).toEqual([
			{ start: 0, length: 2 },
			{ start: 2, length: 2 },
			{ start: 4, length: 1 },
			{ start: 5, length: 1 }
		]);
	});

	it("does not merge chords that share a root but differ in base quality", () => {
		// V (major) then v (minor) stay distinct — only extensions are ignored.
		const { chords } = collapseAdjacentCanonical([V, chord(7, "minor")]);
		expect(chords).toHaveLength(2);
	});

	it("does not merge non-adjacent duplicates", () => {
		const { chords, originalRanges } = collapseAdjacentCanonical([I, V, I]);
		expect(chords).toHaveLength(3);
		expect(originalRanges).toEqual([
			{ start: 0, length: 1 },
			{ start: 1, length: 1 },
			{ start: 2, length: 1 }
		]);
	});

	it("collapses a whole repeating loop with mixed voicings", () => {
		const loop = [I, I_MAJ7, V7, V_SUS4, VI7, IV];
		const { chords } = collapseAdjacentCanonical([...loop, ...loop]);
		// I·V·vi·IV twice, with no adjacent duplicates spanning the loop boundary.
		expect(chords.map((c) => c.suffix)).toEqual([
			"major",
			"major",
			"minor",
			"major",
			"major",
			"major",
			"minor",
			"major"
		]);
	});

	it("returns empty structures for an empty progression", () => {
		expect(collapseAdjacentCanonical([])).toEqual({
			chords: [],
			originalRanges: []
		});
	});
});

describe("collapsedMatchToOriginalMatch", () => {
	const originalRanges = [
		{ start: 0, length: 2 },
		{ start: 2, length: 2 },
		{ start: 4, length: 1 },
		{ start: 5, length: 1 }
	];

	it("expands a collapsed match to cover every underlying chord position", () => {
		// Collapsed match [0,1] (two chords) spans original positions 0..3.
		expect(
			collapsedMatchToOriginalMatch({ start: 0, length: 2 }, originalRanges)
		).toEqual({ start: 0, length: 4 });
	});

	it("maps a single collapsed chord back to its original span", () => {
		expect(
			collapsedMatchToOriginalMatch({ start: 1, length: 1 }, originalRanges)
		).toEqual({ start: 2, length: 2 });
	});

	it("maps a full-length match across the whole progression", () => {
		expect(
			collapsedMatchToOriginalMatch({ start: 0, length: 4 }, originalRanges)
		).toEqual({ start: 0, length: 6 });
	});
});
