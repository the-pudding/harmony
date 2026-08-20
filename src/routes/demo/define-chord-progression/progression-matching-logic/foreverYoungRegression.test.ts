import { describe, expect, it } from "vitest";
import songs from "../../../../../static/data/songs.json";
import coreProgressions from "$data/core-progressions.js";
import { groupSongs } from "../../../../data/songBrowser.js";
import { selectFinalProgressions } from "./finalProgressionSelection.js";

// "Forever Young" (Jay-Z, Mr. Hudson) — repeats "axis of awesome" (I-V-vi-IV,
// 4 chords) with an occasional "V-ii" turnaround before looping again. Since
// the progression is 4 chords already (not 3), it should never be a
// candidate for extension in the first place — extending it shredded it into
// an anonymous I-V-vi-IV-V-ii plus a leftover fragment instead of just
// repeating cleanly.
const song = groupSongs(
	(songs as { songKey: string }[]).filter(
		(s) => s.songKey === "jay-z-mr-hudson__young-forever"
	) as Parameters<typeof groupSongs>[0]
)[0];

describe("forever young regression — 4-chord core progressions are never extended", () => {
	it("keeps the bare axis of awesome (I-V-vi-IV) core progression", () => {
		const result = selectFinalProgressions(song, coreProgressions);
		expect(
			result.coreSelected.map((match) => match.chordProgression)
		).toContain("I-V-vi-IV");
	});

	it("does not surface any extended I-V-vi-IV-* pattern", () => {
		const result = selectFinalProgressions(song, coreProgressions);
		expect(
			result.gapSelected.some((match) =>
				match.chordProgression.startsWith("I-V-vi-IV-")
			)
		).toBe(false);
	});
});
