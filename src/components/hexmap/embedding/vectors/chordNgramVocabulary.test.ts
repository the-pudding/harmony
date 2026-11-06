import { describe, expect, it } from "vitest";
import {
	buildChordNgramVocabulary,
	countGramsForSong,
	NGRAM_MAX_LENGTH,
	NGRAM_MIN_LENGTH,
	type NgramSongInput
} from "./chordNgramVocabulary.js";

const song = (songKey: string, romanTokens: string[]): NgramSongInput => ({
	songKey,
	sections: [{ romanTokens, scale: "major" }]
});

describe("countGramsForSong", () => {
	it("counts every 2- and 3-chord consecutive window", () => {
		const counts = countGramsForSong(song("a", ["I", "IV", "V"]));
		// bigrams: I-IV, IV-V; trigram: I-IV-V
		expect(counts.get("major:I-IV")).toBe(1);
		expect(counts.get("major:IV-V")).toBe(1);
		expect(counts.get("major:I-IV-V")).toBe(1);
		expect(counts.size).toBe(3);
	});

	it("respects NGRAM_MIN_LENGTH / NGRAM_MAX_LENGTH", () => {
		const counts = countGramsForSong(song("a", ["I", "IV"]));
		for (const gram of counts.keys()) {
			const length = gram.split(":")[1].split("-").length;
			expect(length).toBeGreaterThanOrEqual(NGRAM_MIN_LENGTH);
			expect(length).toBeLessThanOrEqual(NGRAM_MAX_LENGTH);
		}
	});

	it("preserves direction — ii-V and V-ii are different grams", () => {
		const counts = countGramsForSong(song("a", ["ii", "V"]));
		expect(counts.has("major:ii-V")).toBe(true);
		expect(counts.has("major:V-ii")).toBe(false);
	});

	it("keeps grams from different scales separate", () => {
		const majorCounts = countGramsForSong({
			songKey: "a",
			sections: [{ romanTokens: ["I", "IV"], scale: "major" }]
		});
		const minorCounts = countGramsForSong({
			songKey: "a",
			sections: [{ romanTokens: ["I", "IV"], scale: "minor" }]
		});
		expect(majorCounts.has("major:I-IV")).toBe(true);
		expect(majorCounts.has("minor:I-IV")).toBe(false);
		expect(minorCounts.has("minor:I-IV")).toBe(true);
	});

	it("accumulates repeated occurrences within a song", () => {
		const counts = countGramsForSong(song("a", ["I", "IV", "I", "IV"]));
		expect(counts.get("major:I-IV")).toBe(2);
	});
});

describe("buildChordNgramVocabulary", () => {
	it("drops grams below the minimum document frequency", () => {
		const songs = [song("a", ["I", "IV"]), song("b", ["I", "IV"])];
		const vocabulary = buildChordNgramVocabulary(songs, 3);
		expect(vocabulary.indexByGram.has("major:I-IV")).toBe(false);
	});

	it("keeps grams that clear the minimum document frequency", () => {
		const songs = [
			song("a", ["I", "IV"]),
			song("b", ["I", "IV"]),
			song("c", ["I", "IV"])
		];
		const vocabulary = buildChordNgramVocabulary(songs, 3);
		expect(vocabulary.indexByGram.has("major:I-IV")).toBe(true);
	});

	it("counts document frequency per song, not per occurrence", () => {
		const songs = [song("a", ["I", "IV", "I", "IV"])];
		const vocabulary = buildChordNgramVocabulary(songs, 1);
		const entry = vocabulary.entries.find((e) => e.gram === "major:I-IV");
		expect(entry?.documentFrequency).toBe(1);
	});
});
