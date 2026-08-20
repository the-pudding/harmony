import { describe, expect, it } from "vitest";
import songs from "../../../../../static/data/songs.json";
import coreProgressions from "$data/core-progressions.js";
import { groupSongs } from "../../../../data/songBrowser.js";
import { selectFinalProgressions } from "./finalProgressionSelection.js";

// "Just Like Fire" (P!nk) — the chorus/verse/intro all repeat the 4-chord
// i-VI-III-iv cycle, but only the 3-chord prefix i-VI-III is a registered
// core progression ("stay with me"). Confirms the extension check recovers
// the real 4-chord unit instead of leaving every trailing iv unexplained.
const song = groupSongs(
	(songs as { songKey: string }[]).filter(
		(s) => s.songKey === "p-nk__just-like-fire"
	) as Parameters<typeof groupSongs>[0]
)[0];

describe("just like fire regression — core-progression extension", () => {
	it("no longer selects the bare i-VI-III core progression", () => {
		const result = selectFinalProgressions(song, coreProgressions);
		expect(
			result.coreSelected.map((match) => match.chordProgression)
		).not.toContain("i-VI-III");
	});

	it("surfaces the extended, non-core i-VI-III-iv pattern instead", () => {
		const result = selectFinalProgressions(song, coreProgressions);
		const extended = result.gapSelected.find(
			(match) => match.chordProgression === "i-VI-III-iv"
		);
		expect(extended).toBeDefined();
		expect(extended!.name).toBe("");
	});

	it("does not regress explained coverage", () => {
		const result = selectFinalProgressions(song, coreProgressions);
		expect(result.explainedPercent).toBeGreaterThan(0);
	});

	it("never reports more than 100% explained coverage", () => {
		// Regression: the extended entry's runningCoverage bookkeeping double-
		// counted the winner's own original 3-chord claim on top of what
		// coreSelection.coverage already had, inflating this past 100%.
		const result = selectFinalProgressions(song, coreProgressions);
		expect(result.explainedPercent).toBeLessThanOrEqual(100);
	});

	it("keeps every entry's own coverage percent within a sane, non-overlapping range", () => {
		// Regression: the extended entry's coveragePercent was computed via an
		// unconstrained rescan, which could report territory a sibling gap-fill
		// entry also independently claimed — summing well past 100%.
		const result = selectFinalProgressions(song, coreProgressions);
		const totalCoveragePercent = result.gapSelected.reduce(
			(sum, match) => sum + match.coveragePercent,
			0
		);
		expect(totalCoveragePercent).toBeLessThanOrEqual(100);
	});
});
