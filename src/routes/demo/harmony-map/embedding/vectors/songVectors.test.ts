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
	progressions: [chordProgression: string, matchCount: number][]
): SongProgressionCounts => ({
	songKey,
	progressionCounts: progressions.map(([chordProgression, matchCount]) => ({
		chordProgression,
		scale: "major",
		matchCount,
		isCore: true
	}))
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
	l2Normalize: false
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
			l2Normalize: true
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
