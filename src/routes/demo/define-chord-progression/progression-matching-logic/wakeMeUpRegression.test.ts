import { describe, expect, it } from "vitest";
import songs from "../../../../../static/data/songs.json";
import coreProgressions from "$data/core-progressions.js";
import { groupSongs } from "../../../../data/songBrowser.js";
import { selectFinalProgressions } from "./finalProgressionSelection.js";

// "Wake Me Up" (Avicii) — its trailing chord after i-VI-III is consistently
// VII, but i-VI-III-VII is already a registered core progression
// ("poker face (chorus)") under a different name. The collision guard should
// mean this song is explained by that existing core progression rather than
// a redundant non-core "extension" of "stay with me".
const song = groupSongs(
	(songs as { songKey: string }[]).filter(
		(s) => s.songKey === "avicii__wake-me-up"
	) as Parameters<typeof groupSongs>[0]
)[0];

describe("wake me up regression — extension declines on an already-registered shape", () => {
	it("does not surface a non-core i-VI-III-VII extension", () => {
		const result = selectFinalProgressions(song, coreProgressions);
		const extended = result.gapSelected.find(
			(match) => match.chordProgression === "i-VI-III-VII"
		);
		expect(extended).toBeUndefined();
	});

	it("does not regress explained coverage", () => {
		const result = selectFinalProgressions(song, coreProgressions);
		expect(result.explainedPercent).toBeGreaterThan(0);
	});
});
