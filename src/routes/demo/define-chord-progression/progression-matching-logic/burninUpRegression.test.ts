import { describe, expect, it } from "vitest";
import songs from "../../../../../static/data/songs.json";
import coreProgressions, {
	chordProgressionVariants
} from "$data/core-progressions.js";
import { groupSongs } from "../../../../data/songBrowser.js";
import {
	computeProgressionMatches,
	computeStatsForParsedProgression
} from "./progressionMatchAnalysis.js";
import { selectFinalProgressions } from "./finalProgressionSelection.js";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";

const burninCore = coreProgressions.find(
	(p) => p.name === "burnin up with you"
)!;
const burninSong = groupSongs(
	(songs as { songKey: string }[]).filter(
		(s) => s.songKey === "jonas-brothers__burnin-up"
	) as Parameters<typeof groupSongs>[0]
)[0];

describe("burnin up — scale-aware core matching regression", () => {
	it("burnin up core entry has scale: minor", () => {
		expect(burninCore.scale).toBe("minor");
	});

	it("i-III-VII-VI parsed as minor matches all 4 instances in burnin up (Verse×2, Chorus×2)", () => {
		const parsed = romanTokensToParsedProgression(
			chordProgressionVariants(burninCore.chordProgression)[0].split("-"),
			"minor"
		)!;
		const stats = computeStatsForParsedProgression(burninSong, parsed);
		expect(stats.matchCount).toBe(4);
		expect(stats.coveragePercent).toBeGreaterThan(65);
	});

	it("computeProgressionMatches surfaces burnin up with 4 matches", () => {
		const matches = computeProgressionMatches(burninSong, coreProgressions);
		const match = matches.find((m) => m.name === "burnin up with you");
		expect(match).toBeDefined();
		expect(match!.matchCount).toBe(4);
		expect(match!.coveragePercent).toBeGreaterThan(65);
	});

	it("selectFinalProgressions picks burnin up as a core selection", () => {
		const selection = selectFinalProgressions(burninSong, coreProgressions);
		const names = selection.coreSelected.map((m) => m.name);
		expect(names).toContain("burnin up with you");
	});

	it("explained coverage beats the old false-positive Cheerleader Verse result (52%)", () => {
		const selection = selectFinalProgressions(burninSong, coreProgressions);
		expect(selection.explainedPercent).toBeGreaterThan(52);
	});

	it("Cheerleader Verse is not the top core selection for burnin up", () => {
		const selection = selectFinalProgressions(burninSong, coreProgressions);
		expect(selection.coreSelected[0]?.name).not.toBe("Cheerleader Verse");
	});
});
