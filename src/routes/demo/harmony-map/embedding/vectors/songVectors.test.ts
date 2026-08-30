import { describe, expect, it } from "vitest";
import { buildProgressionVocabulary } from "./progressionVocabulary.js";
import type { SongProgressionCounts } from "./progressionVocabulary.js";
import {
	buildSongVectors,
	inverseDocumentFrequency,
	toMatrix
} from "./songVectors.js";

const makeSong = (
	songKey: string,
	progressions: [
		chordProgression: string,
		matchCount: number,
		chorusMatchCount?: number
	][]
): SongProgressionCounts => ({
	songKey,
	progressionCounts: progressions.map(
		([chordProgression, matchCount, chorusMatchCount = 0]) => ({
			chordProgression,
			scale: "major",
			matchCount,
			chorusMatchCount,
			coveragePercent: 0,
			isCore: true
		})
	)
});

const songs = [
	makeSong("a", [
		["I-V-vi-IV", 4],
		["ii-V-I", 1]
	]),
	makeSong("b", [["I-V-vi-IV", 2]])
];

const vocabulary = buildProgressionVocabulary(songs, 1);

const RAW_UNNORMALIZED = {
	weighting: "raw",
	useTfIdf: false,
	l2Normalize: false,
	weightChorus: false
} as const;

describe("buildSongVectors", () => {
	it("places raw match counts at the vocabulary index", () => {
		const { vectorBySongKey } = buildSongVectors(
			songs,
			vocabulary,
			RAW_UNNORMALIZED
		);
		const index = vocabulary.indexByChordProgression.get("I-V-vi-IV")!;
		expect(vectorBySongKey.get("a")!.counts[index]).toBe(4);
		expect(vectorBySongKey.get("b")!.counts[index]).toBe(2);
	});

	it("sums sibling variants of one named progression into one dimension", () => {
		const bothVariants = [
			makeSong("a", [
				["ii-bii-I", 3],
				["ii-V-I", 2]
			])
		];
		const variantVocabulary = buildProgressionVocabulary(bothVariants, 1);
		const { vectorBySongKey } = buildSongVectors(
			bothVariants,
			variantVocabulary,
			RAW_UNNORMALIZED
		);
		const index = variantVocabulary.indexByChordProgression.get("ii-V-I")!;
		expect(vectorBySongKey.get("a")!.counts[index]).toBe(5);
		expect(
			vectorBySongKey.get("a")!.counts.filter((count) => count > 0)
		).toHaveLength(1);
	});

	it("counts sibling variants as one occurrence when weighting is binary", () => {
		const bothVariants = [
			makeSong("a", [
				["ii-bii-I", 3],
				["ii-V-I", 2]
			])
		];
		const variantVocabulary = buildProgressionVocabulary(bothVariants, 1);
		const { vectorBySongKey } = buildSongVectors(
			bothVariants,
			variantVocabulary,
			{ ...RAW_UNNORMALIZED, weighting: "binary" }
		);
		expect(vectorBySongKey.get("a")!.counts).toEqual([1]);
	});

	it("collapses counts to presence when weighting is binary", () => {
		const { vectorBySongKey } = buildSongVectors(songs, vocabulary, {
			...RAW_UNNORMALIZED,
			weighting: "binary"
		});
		expect(vectorBySongKey.get("a")!.counts).toEqual([1, 1]);
	});

	it("scales by idf, giving rarer progressions more weight", () => {
		const { vectorBySongKey, inverseDocumentFrequencies } = buildSongVectors(
			songs,
			vocabulary,
			{ ...RAW_UNNORMALIZED, useTfIdf: true }
		);
		const commonIndex = vocabulary.indexByChordProgression.get("I-V-vi-IV")!;
		const rareIndex = vocabulary.indexByChordProgression.get("ii-V-I")!;
		expect(inverseDocumentFrequencies[rareIndex]).toBeGreaterThan(
			inverseDocumentFrequencies[commonIndex]
		);
		expect(vectorBySongKey.get("a")!.weighted[rareIndex]).toBeCloseTo(
			inverseDocumentFrequencies[rareIndex]
		);
	});

	it("normalizes weighted vectors to unit length", () => {
		const { vectorBySongKey } = buildSongVectors(songs, vocabulary, {
			weighting: "raw",
			useTfIdf: true,
			l2Normalize: true,
			weightChorus: false
		});
		const norm = Math.sqrt(
			vectorBySongKey
				.get("a")!
				.weighted.reduce((sum, value) => sum + value * value, 0)
		);
		expect(norm).toBeCloseTo(1);
	});

	it("leaves an all-zero vector untouched when normalizing", () => {
		const { vectorBySongKey } = buildSongVectors(
			[...songs, makeSong("c", [])],
			vocabulary
		);
		expect(
			vectorBySongKey.get("c")!.weighted.every((value) => value === 0)
		).toBe(true);
	});

	it("multiplies chorus matches by the chorus weight when weightChorus is on", () => {
		const chorusSongs = [makeSong("a", [["I-V-vi-IV", 4, 3]])];
		const chorusVocabulary = buildProgressionVocabulary(chorusSongs, 1);
		const index = chorusVocabulary.indexByChordProgression.get("I-V-vi-IV")!;

		const { vectorBySongKey: withWeighting } = buildSongVectors(
			chorusSongs,
			chorusVocabulary,
			{ ...RAW_UNNORMALIZED, weightChorus: true }
		);
		const { vectorBySongKey: withoutWeighting } = buildSongVectors(
			chorusSongs,
			chorusVocabulary,
			RAW_UNNORMALIZED
		);

		// 4 total matches, 3 of them in a chorus, weight 3x: 1 non-chorus + 3*3 chorus = 10
		expect(withWeighting.get("a")!.counts[index]).toBe(10);
		expect(withoutWeighting.get("a")!.counts[index]).toBe(4);
	});

	it("sums chorus matches from sibling variants into one dimension", () => {
		const bothVariants = [
			makeSong("a", [
				["ii-bii-I", 3, 1],
				["ii-V-I", 2, 2]
			])
		];
		const variantVocabulary = buildProgressionVocabulary(bothVariants, 1);
		const index = variantVocabulary.indexByChordProgression.get("ii-V-I")!;

		const { vectorBySongKey } = buildSongVectors(
			bothVariants,
			variantVocabulary,
			{ ...RAW_UNNORMALIZED, weightChorus: true }
		);

		// (3 - 1) non-chorus + 1*3 chorus + (2 - 2) non-chorus + 2*3 chorus = 2 + 3 + 0 + 6 = 11
		expect(vectorBySongKey.get("a")!.counts[index]).toBe(11);
	});

	it("emits one matrix row per song aligned with the vector order", () => {
		const vectorSet = buildSongVectors(songs, vocabulary, RAW_UNNORMALIZED);
		expect(toMatrix(vectorSet.vectors)).toEqual([
			vectorSet.vectors[0].weighted,
			vectorSet.vectors[1].weighted
		]);
	});
});

describe("inverseDocumentFrequency", () => {
	it("decreases as a progression appears in more songs", () => {
		expect(inverseDocumentFrequency(100, 1)).toBeGreaterThan(
			inverseDocumentFrequency(100, 50)
		);
	});

	it("never drops below one", () => {
		expect(inverseDocumentFrequency(10, 10)).toBeGreaterThanOrEqual(1);
	});
});
