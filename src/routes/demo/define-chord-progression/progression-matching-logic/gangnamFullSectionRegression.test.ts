import { describe, expect, it } from "vitest";
import songs from "../../../../../static/data/songs.json";
import coreProgressions from "$data/core-progressions.js";
import { groupSongs } from "../../../../data/songBrowser.js";
import {
	computeProgressionMatches,
	fullyCoversAnySection
} from "./progressionMatchAnalysis.js";
import { selectFinalProgressions } from "./finalProgressionSelection.js";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";

const gangnamSong = groupSongs(
	(songs as { songKey: string }[]).filter(
		(s) => s.songKey === "psy__gangnam-style"
	) as Parameters<typeof groupSongs>[0]
)[0];

const iivvCore = coreProgressions.find(
	(p) => p.chordProgression === "i-iv-v"
)!;

describe("gangnam style — full-section single-match exception regression", () => {
	it("gangnam-style song is found in the dataset", () => {
		expect(gangnamSong).toBeDefined();
	});

	it("i-iv-v core progression entry exists", () => {
		expect(iivvCore).toBeDefined();
	});

	it("i-iv-v parsed as minor appears exactly once in gangnam-style", () => {
		const parsed = romanTokensToParsedProgression(
			iivvCore.chordProgression.split("-"),
			"minor"
		)!;
		const section = gangnamSong.sections[0];
		expect(section).toBeDefined();
		expect(section.parsedProgression.length).toBe(3);
		expect(fullyCoversAnySection(gangnamSong, parsed)).toBe(true);
	});

	it("computeProgressionMatches includes i-iv-v despite matchCount === 1", () => {
		const matches = computeProgressionMatches(gangnamSong, coreProgressions);
		const match = matches.find((m) => m.chordProgression === "i-iv-v");
		expect(match).toBeDefined();
		expect(match!.matchCount).toBe(1);
		expect(match!.isFullSectionSingleMatch).toBe(true);
	});

	it("selectFinalProgressions picks i-iv-v as a core selection", () => {
		const selection = selectFinalProgressions(gangnamSong, coreProgressions);
		const progressions = selection.coreSelected.map((m) => m.chordProgression);
		expect(progressions).toContain("i-iv-v");
	});
});
