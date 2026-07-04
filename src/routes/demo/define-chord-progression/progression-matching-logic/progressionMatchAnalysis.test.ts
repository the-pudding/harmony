import { describe, expect, it } from "vitest";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";
import type {
	GroupedSong,
	SongSection
} from "../../progressions/songBrowser.js";
import type { ParsedProgressionChord } from "../../../../chord-processing/types.js";
import {
	computeProgressionMatches,
	computeStatsForParsedProgression
} from "./progressionMatchAnalysis.js";
import coreProgressions from "$data/core-progressions.js";

const chord = (
	rootPitchClass: number,
	suffix: string,
	bassPitchClass?: number
): ParsedProgressionChord => ({
	rootPitchClass,
	suffix,
	...(bassPitchClass !== undefined ? { bassPitchClass } : {}),
	display: ""
});

// C major: I=C, vi=Am, iii=Em, V=G
const C_MAJOR = chord(0, "major");
const A_MINOR = chord(9, "minor");
const A_MINOR7 = chord(9, "minor7");
const E_MINOR = chord(4, "minor");
const E_MINOR7 = chord(4, "minor7");
const G_MAJOR = chord(7, "major");

const makeSection = (parsedProgression: ParsedProgressionChord[]): SongSection => ({
	label: null,
	chords: [],
	romanTokens: [],
	parsedProgression,
	keyLabel: null
});

const darkDooWop = coreProgressions.find(
	(p) => p.name === "dark doo wop (save your tears for another day)"
)!;
const darkDooWopParsed = romanTokensToParsedProgression(
	darkDooWop.chordProgression.split("-")
)!;

// Regression: the-weeknd "Save Your Tears" — the HookTheory source transcribes
// the vi and iii chords with 7th extensions (vi7, iii7). The suffix for vi7 is
// "minor7" while the core progression I-vi-iii-V uses plain "minor". Before the
// fix, the strict suffix comparison caused 0 matches in any HookTheory section,
// blatantly missing the "verse" (2 instances) and one "chorus" (2 instances).
//
// Each section below mirrors a real HookTheory section: 8 chords = I-vi7-iii7-V
// repeated twice, which contains 2 non-overlapping instances of I-vi-iii-V.
const saveYourTearsHooktheory: GroupedSong = {
	songKey: "the-weeknd__save-your-tears",
	title: "Save Your Tears",
	artists: ["The Weeknd"],
	keyLabel: "C major",
	sections: [
		makeSection([C_MAJOR, A_MINOR7, E_MINOR7, G_MAJOR, C_MAJOR, A_MINOR7, E_MINOR7, G_MAJOR]),
		makeSection([C_MAJOR, A_MINOR7, E_MINOR7, G_MAJOR, C_MAJOR, A_MINOR7, E_MINOR7, G_MAJOR])
	]
};

// The same song but with plain (no-extension) chords, as in the UG source.
const saveYourTearsUg: GroupedSong = {
	songKey: "the-weeknd__save-your-tears",
	title: "Save Your Tears",
	artists: ["The Weeknd"],
	keyLabel: "C major",
	sections: [
		makeSection([C_MAJOR, A_MINOR, E_MINOR, G_MAJOR, C_MAJOR, A_MINOR, E_MINOR, G_MAJOR]),
		makeSection([C_MAJOR, A_MINOR, E_MINOR, G_MAJOR, C_MAJOR, A_MINOR, E_MINOR, G_MAJOR])
	]
};

describe("computeStatsForParsedProgression — extension-stripping regression (save your tears)", () => {
	it("counts I-vi7-iii7-V sections as matching I-vi-iii-V (dark doo wop)", () => {
		const stats = computeStatsForParsedProgression(saveYourTearsHooktheory, darkDooWopParsed);
		expect(stats.matchCount).toBe(4);
	});

	it("counts the same matches as the plain (no-extension) version", () => {
		const statsWithExtensions = computeStatsForParsedProgression(
			saveYourTearsHooktheory,
			darkDooWopParsed
		);
		const statsPlain = computeStatsForParsedProgression(saveYourTearsUg, darkDooWopParsed);
		expect(statsWithExtensions.matchCount).toBe(statsPlain.matchCount);
		expect(statsWithExtensions.coveragePercent).toBe(statsPlain.coveragePercent);
	});

	it("covers 100% of each 7th-chord section when the whole section is the pattern", () => {
		const stats = computeStatsForParsedProgression(saveYourTearsHooktheory, darkDooWopParsed);
		expect(stats.coveragePercent).toBe(100);
	});
});

describe("computeProgressionMatches — extension-stripping regression (save your tears)", () => {
	it("surfaces dark doo wop even when all sections use 7th-chord voicings", () => {
		const matches = computeProgressionMatches(saveYourTearsHooktheory, coreProgressions);
		const darkDooWopMatch = matches.find(
			(m) => m.name === darkDooWop.name
		);
		expect(darkDooWopMatch).toBeDefined();
		expect(darkDooWopMatch!.matchCount).toBe(4);
	});

	it("reports the same match count regardless of whether 7ths are present", () => {
		const matchesHt = computeProgressionMatches(saveYourTearsHooktheory, coreProgressions);
		const matchesUg = computeProgressionMatches(saveYourTearsUg, coreProgressions);
		const htCount = matchesHt.find((m) => m.name === darkDooWop.name)?.matchCount;
		const ugCount = matchesUg.find((m) => m.name === darkDooWop.name)?.matchCount;
		expect(htCount).toBe(ugCount);
	});
});
