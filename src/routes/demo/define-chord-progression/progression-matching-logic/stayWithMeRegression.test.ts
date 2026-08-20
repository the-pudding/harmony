import { describe, expect, it } from "vitest";
import songs from "../../../../../static/data/songs.json";
import coreProgressions from "$data/core-progressions.js";
import { groupSongs } from "../../../../data/songBrowser.js";
import { selectFinalProgressions } from "./finalProgressionSelection.js";

// "Stay With Me" (Sam Smith) — the namesake song for the i-VI-III core
// progression. Its trailing chord after i-VI-III varies (i, VII, I) rather
// than being consistent, so the extension check must decline and leave the
// bare 3-chord core progression selected, unlike "Just Like Fire".
const song = groupSongs(
	(songs as { songKey: string }[]).filter(
		(s) => s.songKey === "sam-smith__stay-with-me"
	) as Parameters<typeof groupSongs>[0]
)[0];

describe("stay with me regression — extension declines on its own namesake song", () => {
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
