import { describe, expect, it } from "vitest";
import songs from "../../../../../static/data/songs.json";
import coreProgressions from "$data/core-progressions.js";
import { groupSongs } from "../../../../data/songBrowser.js";
import { selectFinalProgressions } from "./finalProgressionSelection.js";

// "Suddenly" (Billy Ocean) — its verses run i·VI·III·iv · VII·III·V ·
// i·VI·III·iv · V, so the 3-chord "stay with me" (i-VI-III) does occur four
// times but never twice in a row. That is exactly the coincidental kind of
// repetition the back-to-back requirement is meant to reject, and rejecting it
// leaves the real 4-chord verse unit free to surface on its own.
const song = groupSongs(
	(songs as { songKey: string }[]).filter(
		(s) => s.songKey === "billy-ocean__suddenly"
	) as Parameters<typeof groupSongs>[0]
)[0];

describe("suddenly regression — back-to-back requirement on a noisier real song", () => {
	it("does not select the bare i-VI-III core progression, since it never repeats back-to-back", () => {
		const result = selectFinalProgressions(song, coreProgressions);
		expect(
			result.coreSelected.map((match) => match.chordProgression)
		).not.toContain("i-VI-III");
	});

	it("selects the real 4-chord i-VI-III-iv verse unit instead", () => {
		const result = selectFinalProgressions(song, coreProgressions);
		const verseUnit = result.coreSelected.find(
			(match) => match.chordProgression === "i-VI-III-iv"
		);
		expect(verseUnit).toBeDefined();
		expect(verseUnit!.name).toBe("just like fire");
	});
});
