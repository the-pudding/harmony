import { describe, expect, it } from "vitest";
import { buildProgressionVocabulary } from "./progressionVocabulary.js";
import type { SongProgressionCounts } from "./progressionVocabulary.js";

const makeSong = (
	songKey: string,
	progressions: [
		chordProgression: string,
		matchCount: number,
		isCore: boolean,
		name?: string
	][]
): SongProgressionCounts => ({
	songKey,
	progressionCounts: progressions.map(
		([chordProgression, matchCount, isCore, name]) => ({
			chordProgression,
			name: name ?? chordProgression,
			scale: "major",
			matchCount,
			chorusMatchCount: 0,
			coveragePercent: 0,
			isCore
		})
	)
});

describe("buildProgressionVocabulary", () => {
	it("always keeps core progressions regardless of document frequency", () => {
		const vocabulary = buildProgressionVocabulary(
			[makeSong("a", [["I-V-vi-IV", 3, true]])],
			2
		);
		expect(vocabulary.indexByChordProgression.has("I-V-vi-IV")).toBe(true);
	});

	it("drops gap progressions below the minimum document frequency", () => {
		const vocabulary = buildProgressionVocabulary(
			[makeSong("a", [["ii-iii-IV", 2, false]])],
			2
		);
		expect(vocabulary.indexByChordProgression.has("ii-iii-IV")).toBe(false);
	});

	it("keeps gap progressions once enough songs contain them", () => {
		const vocabulary = buildProgressionVocabulary(
			[
				makeSong("a", [["ii-iii-IV", 2, false]]),
				makeSong("b", [["ii-iii-IV", 5, false]])
			],
			2
		);
		expect(vocabulary.indexByChordProgression.has("ii-iii-IV")).toBe(true);
	});

	it("counts document frequency per song rather than per occurrence", () => {
		const vocabulary = buildProgressionVocabulary(
			[
				makeSong("a", [
					["I-V-vi-IV", 4, true],
					["I-V-vi-IV", 2, true]
				])
			],
			1
		);
		expect(vocabulary.entries[0].documentFrequency).toBe(1);
	});

	it("assigns contiguous indices ordered with core progressions first", () => {
		const vocabulary = buildProgressionVocabulary(
			[
				makeSong("a", [
					["ii-iii-IV", 2, false],
					["I-V-vi-IV", 2, true]
				]),
				makeSong("b", [["ii-iii-IV", 2, false]])
			],
			1
		);
		expect(vocabulary.entries.map((entry) => entry.chordProgression)).toEqual([
			"I-V-vi-IV",
			"ii-iii-IV"
		]);
		expect(vocabulary.entries.map((entry) => entry.index)).toEqual([0, 1]);
	});

	it("gives authored sibling variants of one named progression a single dimension", () => {
		const vocabulary = buildProgressionVocabulary(
			[makeSong("a", [["ii-bii-I", 3, true, "jazz ii-V-I"]])],
			1
		);
		const canonicalIndex = vocabulary.indexByChordProgression.get("ii-bii-I");
		expect(vocabulary.indexByChordProgression.get("ii-V-I")).toBe(
			canonicalIndex
		);
		expect(vocabulary.indexByChordProgression.get("ii-bII-I")).toBe(
			canonicalIndex
		);
		expect(
			vocabulary.entries.filter((entry) => entry.name === "jazz ii-V-I")
		).toHaveLength(1);
	});

	it("counts a song once when it matches two variants of one progression", () => {
		const vocabulary = buildProgressionVocabulary(
			[
				makeSong("a", [
					["ii-bii-I", 3, true, "jazz ii-V-I"],
					["ii-V-I", 2, true, "jazz ii-V-I"]
				])
			],
			1
		);
		expect(vocabulary.entries[0].documentFrequency).toBe(1);
	});

	it("merges an un-authored rotated spelling into the same dimension as its named progression", () => {
		// Matching is tonic-rotation-invariant, so a song can match a named
		// core progression under a literal spelling that was never authored
		// as a variant (e.g. Sweet Home Alabama reads as "V-IV-I" in its own
		// key, the same shape as "sweet home mixolydian"'s authored
		// "I-bVII-IV"). Both must land on the same vocabulary dimension.
		const vocabulary = buildProgressionVocabulary(
			[
				makeSong("authored-spelling", [
					["I-bVII-IV", 5, true, "sweet home mixolydian"]
				]),
				makeSong("rotated-spelling", [
					["V-IV-I", 3, true, "sweet home mixolydian"]
				])
			],
			1
		);
		const canonicalIndex =
			vocabulary.indexByChordProgression.get("I-bVII-IV");
		expect(vocabulary.indexByChordProgression.get("V-IV-I")).toBe(
			canonicalIndex
		);
		expect(
			vocabulary.entries.filter((entry) => entry.name === "sweet home mixolydian")
		).toHaveLength(1);
		expect(
			vocabulary.entries.find((entry) => entry.name === "sweet home mixolydian")
				?.documentFrequency
		).toBe(2);
	});

	it("reports the document count used for idf", () => {
		const vocabulary = buildProgressionVocabulary([
			makeSong("a", [["I-V-vi-IV", 2, true]]),
			makeSong("b", [["I-V-vi-IV", 2, true]])
		]);
		expect(vocabulary.documentCount).toBe(2);
	});
});
