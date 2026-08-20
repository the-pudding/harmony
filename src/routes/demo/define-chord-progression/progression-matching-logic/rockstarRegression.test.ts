import { describe, expect, it } from "vitest";
import songs from "../../../../../static/data/songs.json";
import coreProgressions from "$data/core-progressions.js";
import { groupSongs } from "../../../../data/songBrowser.js";
import { selectFinalProgressions } from "./finalProgressionSelection.js";

// "Rockstar" (Nickelback) — generalizes the fix beyond "stay with me" to a
// different core progression, "creep" (I-III-IV). The real chorus unit is
// I-III-IV-VI-VII, 5 chords, but only 3 chords are registered.
const song = groupSongs(
	(songs as { songKey: string }[]).filter(
		(s) => s.songKey === "nickelback__rockstar"
	) as Parameters<typeof groupSongs>[0]
)[0];

describe("rockstar regression — core-progression extension generalizes beyond stay with me", () => {
	it("no longer selects the bare I-III-IV core progression", () => {
		const result = selectFinalProgressions(song, coreProgressions);
		expect(
			result.coreSelected.map((match) => match.chordProgression)
		).not.toContain("I-III-IV");
	});

	it("surfaces the extended, non-core I-III-IV-VI-VII pattern instead", () => {
		const result = selectFinalProgressions(song, coreProgressions);
		const extended = result.gapSelected.find(
			(match) => match.chordProgression === "I-III-IV-VI-VII"
		);
		expect(extended).toBeDefined();
		expect(extended!.name).toBe("");
	});
});
