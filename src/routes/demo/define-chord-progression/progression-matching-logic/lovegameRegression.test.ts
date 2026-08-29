import { describe, expect, it } from "vitest";
import songs from "../../../../../static/data/songs.json";
import coreProgressions from "$data/core-progressions.js";
import { groupSongs } from "../../../../data/songBrowser.js";
import { selectFinalProgressions } from "./finalProgressionSelection.js";

// "LoveGame" (Lady Gaga) — the song's own unit is a 6-chord cycle,
// i-VI-III-iv-v-III, which opens with the registered "just like fire"
// (i-VI-III-iv). Registering that 4-chord shape is a deliberate trade: it names
// the opening here rather than leaving gap-fill to mint the whole anonymous
// cycle, at the cost of the two trailing chords going unexplained.
const song = groupSongs(
	(songs as { songKey: string }[]).filter(
		(s) => s.songKey === "lady-gaga__lovegame"
	) as Parameters<typeof groupSongs>[0]
)[0];

describe("lovegame regression — a registered 4-chord shape names the cycle's opening", () => {
	it("selects just like fire rather than an anonymous 6-chord cycle", () => {
		const result = selectFinalProgressions(song, coreProgressions);
		const opening = result.coreSelected.find(
			(match) => match.chordProgression === "i-VI-III-iv"
		);
		expect(opening).toBeDefined();
		expect(opening!.name).toBe("just like fire");
	});

	it("no longer selects the bare i-VI-III core progression", () => {
		const result = selectFinalProgressions(song, coreProgressions);
		expect(
			result.coreSelected.map((match) => match.chordProgression)
		).not.toContain("i-VI-III");
	});
});
