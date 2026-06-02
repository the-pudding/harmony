import { describe, expect, it } from "vitest";
import { romanTokensToPrecomputedAbstract } from "../chord-processing/romanNumerals.js";
import {
	computePartialGramStats,
	computeVariableGramStats
} from "./computeVariableGramStats.js";

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
			{ minNumChordsToCountAsAProgression: 2, maxLen: 4 },
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
			{ minNumChordsToCountAsAProgression: 2, maxLen: 4 },
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
			{ topN: 10, minNumChordsToCountAsAProgression: 2, maxLen: 2 },
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
			{ minNumChordsToCountAsAProgression: 2, maxLen: 2 },
			null
		);

		const gramKeys = partial.gramCounts.map(([gram]) => gram);
		expect(gramKeys).toContain("V,I");
	});
});
