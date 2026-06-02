import { describe, expect, it } from "vitest";
import { romanTokensToPrecomputedAbstract } from "../chord-processing/romanNumerals.js";
import {
	canonicalRotation,
	computePartialGramStats,
	computeVariableGramStats,
	minimalPeriod,
	normalizeGramTokens
} from "./computeVariableGramStats.js";

const noNormalization = {
	aggregateRepeats: false,
	canonicalizeRotations: false
};

const defaultNormalization = {
	aggregateRepeats: true,
	canonicalizeRotations: false
};

const gramKeysFromPartial = (
	partial: ReturnType<typeof computePartialGramStats>
) => partial.gramCounts.map(([gram]) => gram);

describe("minimalPeriod", () => {
	it("V→I→V→I and I→V→I→V→I both collapse to the shortest repeating unit", () => {
		expect(minimalPeriod(["V", "I", "V", "I"])).toEqual(["V", "I"]);
		expect(minimalPeriod(["I", "V", "I", "V", "I"])).toEqual(["I", "V"]);
	});

	it("I→IV→I→IV and I→IV→I→IV→I both collapse to I→IV", () => {
		expect(minimalPeriod(["I", "IV", "I", "IV"])).toEqual(["I", "IV"]);
		expect(minimalPeriod(["I", "IV", "I", "IV", "I"])).toEqual(["I", "IV"]);
	});

	it("longer triple repeats use the same rule (vi→IV three times → vi→IV)", () => {
		expect(minimalPeriod(["vi", "IV", "vi", "IV", "vi", "IV"])).toEqual([
			"vi",
			"IV"
		]);
	});

	it("I→V→vi→IV has no shorter period, so it stays four chords", () => {
		expect(minimalPeriod(["I", "V", "vi", "IV"])).toEqual([
			"I",
			"V",
			"vi",
			"IV"
		]);
	});
});

describe("canonicalRotation", () => {
	it("V→I and I→V share one canonical starting point (I→V)", () => {
		expect(canonicalRotation(["V", "I"])).toEqual(["I", "V"]);
		expect(canonicalRotation(["I", "V"])).toEqual(["I", "V"]);
	});

	it("all four rotations of I→V→vi→IV map to the same key", () => {
		const canonical = ["I", "V", "vi", "IV"];
		expect(canonicalRotation(["I", "V", "vi", "IV"])).toEqual(canonical);
		expect(canonicalRotation(["V", "vi", "IV", "I"])).toEqual(canonical);
		expect(canonicalRotation(["vi", "IV", "I", "V"])).toEqual(canonical);
		expect(canonicalRotation(["IV", "I", "V", "vi"])).toEqual(canonical);
	});
});

describe("normalizeGramTokens", () => {
	it("with both off, the raw window is unchanged", () => {
		expect(normalizeGramTokens(["V", "I", "V", "I"], noNormalization)).toEqual([
			"V",
			"I",
			"V",
			"I"
		]);
		expect(normalizeGramTokens(["V", "I"], noNormalization)).toEqual([
			"V",
			"I"
		]);
	});

	it("aggregate repeats: long repeats become the motif, then phase is aligned", () => {
		expect(
			normalizeGramTokens(["V", "I", "V", "I"], defaultNormalization)
		).toEqual(["I", "V"]);
		expect(
			normalizeGramTokens(["I", "V", "I", "V", "I"], defaultNormalization)
		).toEqual(["I", "V"]);
		expect(
			normalizeGramTokens(["I", "IV", "I", "IV", "I"], defaultNormalization)
		).toEqual(["I", "IV"]);
	});

	it("canonicalize rotations only: two-chord order merges, four-chord loops do not", () => {
		expect(
			normalizeGramTokens(["V", "I"], {
				aggregateRepeats: false,
				canonicalizeRotations: true
			})
		).toEqual(["I", "V"]);
		expect(
			normalizeGramTokens(["I", "V", "vi", "IV"], {
				aggregateRepeats: false,
				canonicalizeRotations: true
			})
		).toEqual(["I", "V", "vi", "IV"]);
	});

	it("non-repeating progressions are unchanged when only aggregate repeats is on", () => {
		expect(
			normalizeGramTokens(["I", "V", "vi", "IV"], defaultNormalization)
		).toEqual(["I", "V", "vi", "IV"]);
	});
});

describe("computePartialGramStats search filter", () => {
	const searchAbstract = romanTokensToPrecomputedAbstract(["I", "V"]);
	if (!searchAbstract) throw new Error("expected search abstract");

	const searchGramFilter = {
		searchAbstract,
		fuzzySearch: false,
		matchAtBeginningOnly: false
	};

	it("only counts grams containing the search progression in order", () => {
		const partial = computePartialGramStats(
			[
				{ romanTokens: ["I", "V", "vi", "IV"], songKey: "song1" },
				{ romanTokens: ["V", "I"], songKey: "song2" }
			],
			{ minNumChordsToCountAsAProgression: 2, maxLen: 4, ...noNormalization },
			searchGramFilter
		);

		const gramKeys = partial.gramCounts.map(([gram]) => gram);
		expect(gramKeys).toContain("I,V");
		expect(gramKeys).toContain("I,V,vi,IV");
		expect(gramKeys).not.toContain("V,I");
		expect(gramKeys).not.toContain("vi,IV");
	});

	it("matchAtBeginningOnly restricts to grams where the search starts at the beginning", () => {
		const partial = computePartialGramStats(
			[{ romanTokens: ["vi", "IV", "I", "V"], songKey: "song1" }],
			{ minNumChordsToCountAsAProgression: 2, maxLen: 4, ...noNormalization },
			{ ...searchGramFilter, matchAtBeginningOnly: true }
		);

		const gramKeys = partial.gramCounts.map(([gram]) => gram);
		expect(gramKeys).toContain("I,V");
		expect(gramKeys).not.toContain("vi,IV");
		expect(gramKeys).not.toContain("vi,IV,I,V");
	});

	it("ranks top grams by unique song count before total occurrences", () => {
		const stats = computeVariableGramStats(
			[
				{
					romanTokens: ["vi", "IV", "vi", "IV", "vi", "IV", "vi", "IV"],
					songKey: "song-a"
				},
				{ romanTokens: ["I", "V"], songKey: "song-b" },
				{ romanTokens: ["I", "V"], songKey: "song-c" },
				{ romanTokens: ["I", "V"], songKey: "song-d" }
			],
			{
				topN: 10,
				minNumChordsToCountAsAProgression: 2,
				maxLen: 2,
				...noNormalization
			},
			null
		);

		const viIv = stats.find((row) => row.label === "vi→IV");
		const iV = stats.find((row) => row.label === "I→V");

		expect(viIv?.songCount).toBe(1);
		expect(viIv?.occurrences).toBeGreaterThan(iV?.occurrences ?? 0);
		expect(iV?.songCount).toBe(3);
		expect(stats[0].label).toBe("I→V");
	});

	it("counts all grams when no search filter is provided", () => {
		const partial = computePartialGramStats(
			[{ romanTokens: ["V", "I"], songKey: "song1" }],
			{ minNumChordsToCountAsAProgression: 2, maxLen: 2, ...noNormalization },
			null
		);

		const gramKeys = partial.gramCounts.map(([gram]) => gram);
		expect(gramKeys).toContain("V,I");
	});
});

describe("computePartialGramStats normalization", () => {
	it("without normalization, V→I→V→I is counted as its own four-chord progression", () => {
		const partial = computePartialGramStats(
			[{ romanTokens: ["V", "I", "V", "I"], songKey: "song1" }],
			{
				minNumChordsToCountAsAProgression: 2,
				maxLen: 4,
				...noNormalization
			},
			null
		);

		expect(gramKeysFromPartial(partial)).toContain("V,I,V,I");
	});

	it("with aggregate repeats on, that same section counts toward I→V instead of V→I→V→I", () => {
		const partial = computePartialGramStats(
			[{ romanTokens: ["V", "I", "V", "I"], songKey: "song1" }],
			{
				minNumChordsToCountAsAProgression: 2,
				maxLen: 4,
				...defaultNormalization
			},
			null
		);

		const gramKeys = gramKeysFromPartial(partial);
		expect(gramKeys).toContain("I,V");
		expect(gramKeys).not.toContain("V,I,V,I");
	});

	it("merges I→V→I→V→I and V→I→V→I into one bucket (I→V)", () => {
		const partial = computePartialGramStats(
			[
				{ romanTokens: ["I", "V", "I", "V", "I"], songKey: "song-a" },
				{ romanTokens: ["V", "I", "V", "I"], songKey: "song-b" }
			],
			{
				minNumChordsToCountAsAProgression: 2,
				maxLen: 5,
				...defaultNormalization
			},
			null
		);

		const iVCount =
			partial.gramCounts.find(([gram]) => gram === "I,V")?.[1] ?? 0;
		const vICount =
			partial.gramCounts.find(([gram]) => gram === "V,I")?.[1] ?? 0;

		expect(iVCount).toBeGreaterThan(0);
		expect(vICount).toBe(0);
	});

	it("merges I→IV→I→IV and I→IV→I→IV→I into one bucket (I→IV)", () => {
		const partial = computePartialGramStats(
			[
				{ romanTokens: ["I", "IV", "I", "IV"], songKey: "song-a" },
				{ romanTokens: ["I", "IV", "I", "IV", "I"], songKey: "song-b" }
			],
			{
				minNumChordsToCountAsAProgression: 2,
				maxLen: 5,
				...defaultNormalization
			},
			null
		);

		const gramKeys = gramKeysFromPartial(partial);
		expect(gramKeys).toContain("I,IV");
		expect(gramKeys).not.toContain("I,IV,I,IV");
		expect(gramKeys).not.toContain("I,IV,I,IV,I");
		expect(gramKeys.find((gram) => gram === "IV,I")).toBeUndefined();
	});

	it("with both toggles off, I→V→vi→IV and V→vi→IV→I stay separate chart rows", () => {
		const partial = computePartialGramStats(
			[
				{ romanTokens: ["I", "V", "vi", "IV"], songKey: "song-a" },
				{ romanTokens: ["V", "vi", "IV", "I"], songKey: "song-b" }
			],
			{
				minNumChordsToCountAsAProgression: 4,
				maxLen: 4,
				...noNormalization
			},
			null
		);

		const gramKeys = gramKeysFromPartial(partial);
		expect(gramKeys).toContain("I,V,vi,IV");
		expect(gramKeys).toContain("V,vi,IV,I");
	});

	it("with aggregate repeats on, rotations are aligned too (so looped four-chord rows also merge)", () => {
		const partial = computePartialGramStats(
			[
				{ romanTokens: ["I", "V", "vi", "IV"], songKey: "song-a" },
				{ romanTokens: ["V", "vi", "IV", "I"], songKey: "song-b" }
			],
			{
				minNumChordsToCountAsAProgression: 4,
				maxLen: 4,
				...defaultNormalization
			},
			null
		);

		const gramKeys = gramKeysFromPartial(partial);
		expect(gramKeys).toContain("I,V,vi,IV");
		expect(gramKeys).not.toContain("V,vi,IV,I");
		expect(partial.gramCounts.find(([gram]) => gram === "I,V,vi,IV")?.[1]).toBe(
			2
		);
	});

	it("with canonicalize rotations on, I→V→vi→IV and V→vi→IV→I count as one progression", () => {
		const partial = computePartialGramStats(
			[
				{ romanTokens: ["I", "V", "vi", "IV"], songKey: "song-a" },
				{ romanTokens: ["V", "vi", "IV", "I"], songKey: "song-b" }
			],
			{
				minNumChordsToCountAsAProgression: 4,
				maxLen: 4,
				aggregateRepeats: false,
				canonicalizeRotations: true
			},
			null
		);

		const gramKeys = gramKeysFromPartial(partial);
		expect(gramKeys).toContain("I,V,vi,IV");
		expect(gramKeys).not.toContain("V,vi,IV,I");
		expect(partial.gramCounts.find(([gram]) => gram === "I,V,vi,IV")?.[1]).toBe(
			2
		);
	});

	it("with canonicalize rotations on, V→I and I→V in different songs count as one two-chord progression", () => {
		const partial = computePartialGramStats(
			[
				{ romanTokens: ["V", "I"], songKey: "song-a" },
				{ romanTokens: ["I", "V"], songKey: "song-b" }
			],
			{
				minNumChordsToCountAsAProgression: 2,
				maxLen: 2,
				aggregateRepeats: false,
				canonicalizeRotations: true
			},
			null
		);

		const gramKeys = gramKeysFromPartial(partial);
		expect(gramKeys).toContain("I,V");
		expect(gramKeys).not.toContain("V,I");
		expect(partial.gramCounts.find(([gram]) => gram === "I,V")?.[1]).toBe(2);
	});
});
