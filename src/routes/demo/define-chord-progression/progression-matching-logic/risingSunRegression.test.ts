import { describe, expect, it } from "vitest";
import songs from "../../../../../static/data/songs.json";
import coreProgressions from "$data/core-progressions.js";
import { groupSongs } from "../../../../data/songBrowser.js";
import { selectFinalProgressions } from "./finalProgressionSelection.js";

// "House of the Rising Sun" (The Animals, Frijid Pink) — the namesake song
// for the "rising sun" core progression (i-III-IV-VI). Its repeats aren't
// perfectly back-to-back (a "i-III-V" turnaround variation breaks up some of
// them), so the chord right after each occurrence — "i", the progression's
// own tonic — looked like a consistent new trailing chord to the extension
// check, which extended "rising sun" into an anonymous i-III-IV-VI-i and
// dropped it out of the core-progressions list entirely. Confirms the "never
// extend into your own first chord" guard keeps it a bare, named core match.
describe("house of the rising sun regression — extension declines into its own tonic", () => {
	for (const songKey of [
		"the-animals__house-of-the-rising-sun",
		"frijid-pink__house-of-the-rising-sun"
	]) {
		it(`still selects the bare i-III-IV-VI core progression for ${songKey}`, () => {
			const song = groupSongs(
				(songs as { songKey: string }[]).filter(
					(s) => s.songKey === songKey
				) as Parameters<typeof groupSongs>[0]
			)[0];
			const result = selectFinalProgressions(song, coreProgressions);
			expect(
				result.coreSelected.map((match) => match.chordProgression)
			).toContain("i-III-IV-VI");
			expect(
				result.gapSelected.some((match) =>
					match.chordProgression.startsWith("i-III-IV-VI-")
				)
			).toBe(false);
		});
	}
});
