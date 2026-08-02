import { describe, expect, it } from "vitest";
import { buildProgressionVocabulary } from "./progressionVocabulary.js";
import type { SongProgressionCounts } from "./progressionVocabulary.js";

const makeSong = (
	songKey: string,
	progressions: [
		chordProgression: string,
		matchCount: number,
		isCore: boolean
	][]
): SongProgressionCounts => ({
	songKey,
	progressionCounts: progressions.map(
		([chordProgression, matchCount, isCore]) => ({
			chordProgression,
			scale: "major",
			matchCount,
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

	it("gives sibling variants of one named progression a single dimension", () => {
		const vocabulary = buildProgressionVocabulary(
			[makeSong("a", [["ii7-V7-Imaj7", 3, true]])],
			1
		);
		const canonicalIndex =
			vocabulary.indexByChordProgression.get("ii7-V7-Imaj7");
		expect(vocabulary.indexByChordProgression.get("ii-V-I")).toBe(
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
					["ii7-V7-Imaj7", 3, true],
					["ii-V-I", 2, true]
				])
			],
			1
		);
		expect(vocabulary.entries[0].documentFrequency).toBe(1);
	});

	it("reports the document count used for idf", () => {
		const vocabulary = buildProgressionVocabulary([
			makeSong("a", [["I-V-vi-IV", 2, true]]),
			makeSong("b", [["I-V-vi-IV", 2, true]])
		]);
		expect(vocabulary.documentCount).toBe(2);
	});
});
