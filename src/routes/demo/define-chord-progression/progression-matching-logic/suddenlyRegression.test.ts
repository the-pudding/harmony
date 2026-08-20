import { describe, expect, it } from "vitest";
import songs from "../../../../../static/data/songs.json";
import coreProgressions from "$data/core-progressions.js";
import { groupSongs } from "../../../../data/songBrowser.js";
import { selectFinalProgressions } from "./finalProgressionSelection.js";

// "Suddenly" (Billy Ocean) — a noisier edge case than "Just Like Fire". Other
// core progressions ("boyband" VI-V-i, "jazz ii-V-I") compete for and claim
// some of the same verse territory before "stay with me" gets its turn,
// leaving it with too few/inconsistent instances to extend confidently. This
// is the case that validates EXTENSION_CONSISTENCY_MIN_PERCENT correctly
// declines rather than over-triggering.
const song = groupSongs(
	(songs as { songKey: string }[]).filter(
		(s) => s.songKey === "billy-ocean__suddenly"
	) as Parameters<typeof groupSongs>[0]
)[0];

describe("suddenly regression — extension declines on a noisier real song", () => {
	it("still selects the bare i-VI-III core progression, un-extended", () => {
		const result = selectFinalProgressions(song, coreProgressions);
		expect(
			result.coreSelected.map((match) => match.chordProgression)
		).toContain("i-VI-III");
	});

	it("does not surface any extended i-VI-III-* pattern", () => {
		const result = selectFinalProgressions(song, coreProgressions);
		const extended = result.gapSelected.find((match) =>
			match.chordProgression.startsWith("i-VI-III-")
		);
		expect(extended).toBeUndefined();
	});
});
