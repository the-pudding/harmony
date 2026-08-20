import { describe, expect, it } from "vitest";
import songs from "../../../../../static/data/songs.json";
import coreProgressions from "$data/core-progressions.js";
import { groupSongs } from "../../../../data/songBrowser.js";
import { selectFinalProgressions } from "./finalProgressionSelection.js";

// "LoveGame" (Lady Gaga) — the real unit is a 6-chord cycle,
// i-VI-III-iv-v-III, three extensions past the 3-chord "stay with me" core
// progression. Confirms the extension check chains multiple rounds up to
// MAX_PROGRESSION_LENGTH instead of stopping after a single +1 chord.
const song = groupSongs(
	(songs as { songKey: string }[]).filter(
		(s) => s.songKey === "lady-gaga__lovegame"
	) as Parameters<typeof groupSongs>[0]
)[0];

describe("lovegame regression — chained core-progression extension", () => {
	it("surfaces the full 6-chord extended pattern", () => {
		const result = selectFinalProgressions(song, coreProgressions);
		const extended = result.gapSelected.find(
			(match) => match.chordProgression === "i-VI-III-iv-v-III"
		);
		expect(extended).toBeDefined();
		expect(extended!.name).toBe("");
	});

	it("no longer selects the bare i-VI-III core progression", () => {
		const result = selectFinalProgressions(song, coreProgressions);
		expect(
			result.coreSelected.map((match) => match.chordProgression)
		).not.toContain("i-VI-III");
	});
});
