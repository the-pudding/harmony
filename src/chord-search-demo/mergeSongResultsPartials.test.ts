import { describe, expect, it } from "vitest";
import { mergeSongResultsPartials } from "./mergeSongResultsPartials.js";

describe("mergeSongResultsPartials", () => {
	it("concatenates section matches and dedupes song keys in chunk order", () => {
		const merged = mergeSongResultsPartials([
			{
				matchedSongKeys: ["a", "b"],
				sectionMatches: [{ id: "1", matches: [{ start: 0, length: 2 }] }]
			},
			{
				matchedSongKeys: ["b", "c"],
				sectionMatches: [{ id: "2", matches: [{ start: 1, length: 2 }] }]
			}
		]);

		expect(merged.matchedSongKeys).toEqual(["a", "b", "c"]);
		expect(merged.sectionMatches).toHaveLength(2);
	});
});
