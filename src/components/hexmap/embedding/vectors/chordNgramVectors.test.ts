import { describe, expect, it } from "vitest";
import { buildChordNgramVocabulary, type NgramSongInput } from "./chordNgramVocabulary.js";
import { buildChordNgramVectors } from "./chordNgramVectors.js";

const song = (songKey: string, romanTokens: string[]): NgramSongInput => ({
	songKey,
	sections: [{ romanTokens, scale: "major" }]
});

describe("buildChordNgramVectors", () => {
	it("emits one vector per song, aligned with the vocabulary dimensions", () => {
		const songs = [
			song("a", ["I", "IV", "V", "I", "IV", "V"]),
			song("b", ["I", "IV", "V", "I", "IV", "V"]),
			song("c", ["vi", "ii", "V"])
		];
		const vocabulary = buildChordNgramVocabulary(songs, 2);
		const vectors = buildChordNgramVectors(songs, vocabulary);

		expect(vectors).toHaveLength(3);
		vectors.forEach((vector) => {
			expect(vector.counts).toHaveLength(vocabulary.entries.length);
			expect(vector.weighted).toHaveLength(vocabulary.entries.length);
		});
	});

	it("gives songs sharing the same gram profile identical vectors", () => {
		const songs = [
			song("a", ["I", "IV", "V", "I", "IV", "V"]),
			song("b", ["I", "IV", "V", "I", "IV", "V"]),
			song("c", ["vi", "ii", "V", "vi", "ii", "V"])
		];
		const vocabulary = buildChordNgramVocabulary(songs, 2);
		const vectors = buildChordNgramVectors(songs, vocabulary);
		expect(vectors[0].weighted).toEqual(vectors[1].weighted);
	});

	it("normalizes each nonzero vector to unit length", () => {
		const songs = [
			song("a", ["I", "IV", "V", "I", "IV", "V"]),
			song("b", ["I", "IV", "V", "I", "IV", "V"])
		];
		const vocabulary = buildChordNgramVocabulary(songs, 2);
		const vectors = buildChordNgramVectors(songs, vocabulary);
		const norm = Math.sqrt(
			vectors[0].weighted.reduce((sum, value) => sum + value * value, 0)
		);
		expect(norm).toBeCloseTo(1);
	});

	it("gives a song with no matching grams an all-zero vector", () => {
		const songs = [
			song("a", ["I", "IV", "V", "I", "IV", "V"]),
			song("b", ["I", "IV", "V", "I", "IV", "V"]),
			song("c", ["bIII", "bVI", "bVII"])
		];
		const vocabulary = buildChordNgramVocabulary(songs, 2);
		const vectors = buildChordNgramVectors(songs, vocabulary);
		const cVector = vectors.find((v) => v.songKey === "c")!;
		expect(cVector.weighted.every((value) => value === 0)).toBe(true);
	});
});
