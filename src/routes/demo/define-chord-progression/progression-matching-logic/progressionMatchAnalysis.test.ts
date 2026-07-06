import { describe, expect, it } from "vitest";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";
import type {
	GroupedSong,
	SongSection
} from "../../progressions/songBrowser.js";
import type { ParsedProgressionChord } from "../../../../chord-processing/types.js";
import {
	computeProgressionMatches,
	computeStatsForParsedProgression,
	computeGapOnlyCoveredPositionsBySection,
	computeGapOnlyStats,
	parseCoreProgressions,
	findMatchingCoreProgressionsForSong,
	buildProgressionMatchRates,
	formatMatchRatePercent
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

const makeSection = (
	parsedProgression: ParsedProgressionChord[]
): SongSection => ({
	label: null,
	chords: [],
	romanTokens: [],
	parsedProgression,
	keyLabel: null,
	scale: "major"
});

const darkDooWop = coreProgressions.find((p) => p.name === "dark doo wop")!;
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
		makeSection([
			C_MAJOR,
			A_MINOR7,
			E_MINOR7,
			G_MAJOR,
			C_MAJOR,
			A_MINOR7,
			E_MINOR7,
			G_MAJOR
		]),
		makeSection([
			C_MAJOR,
			A_MINOR7,
			E_MINOR7,
			G_MAJOR,
			C_MAJOR,
			A_MINOR7,
			E_MINOR7,
			G_MAJOR
		])
	]
};

// The same song but with plain (no-extension) chords, as in the UG source.
const saveYourTearsUg: GroupedSong = {
	songKey: "the-weeknd__save-your-tears",
	title: "Save Your Tears",
	artists: ["The Weeknd"],
	keyLabel: "C major",
	sections: [
		makeSection([
			C_MAJOR,
			A_MINOR,
			E_MINOR,
			G_MAJOR,
			C_MAJOR,
			A_MINOR,
			E_MINOR,
			G_MAJOR
		]),
		makeSection([
			C_MAJOR,
			A_MINOR,
			E_MINOR,
			G_MAJOR,
			C_MAJOR,
			A_MINOR,
			E_MINOR,
			G_MAJOR
		])
	]
};

describe("computeStatsForParsedProgression — extension-stripping regression (save your tears)", () => {
	it("counts I-vi7-iii7-V sections as matching I-vi-iii-V (dark doo wop)", () => {
		const stats = computeStatsForParsedProgression(
			saveYourTearsHooktheory,
			darkDooWopParsed
		);
		expect(stats.matchCount).toBe(4);
	});

	it("counts the same matches as the plain (no-extension) version", () => {
		const statsWithExtensions = computeStatsForParsedProgression(
			saveYourTearsHooktheory,
			darkDooWopParsed
		);
		const statsPlain = computeStatsForParsedProgression(
			saveYourTearsUg,
			darkDooWopParsed
		);
		expect(statsWithExtensions.matchCount).toBe(statsPlain.matchCount);
		expect(statsWithExtensions.coveragePercent).toBe(
			statsPlain.coveragePercent
		);
	});

	it("covers 100% of each 7th-chord section when the whole section is the pattern", () => {
		const stats = computeStatsForParsedProgression(
			saveYourTearsHooktheory,
			darkDooWopParsed
		);
		expect(stats.coveragePercent).toBe(100);
	});
});

describe("computeProgressionMatches — extension-stripping regression (save your tears)", () => {
	it("surfaces dark doo wop even when all sections use 7th-chord voicings", () => {
		const matches = computeProgressionMatches(
			saveYourTearsHooktheory,
			coreProgressions
		);
		const darkDooWopMatch = matches.find((m) => m.name === darkDooWop.name);
		expect(darkDooWopMatch).toBeDefined();
		expect(darkDooWopMatch!.matchCount).toBe(4);
	});

	it("reports the same match count regardless of whether 7ths are present", () => {
		const matchesHt = computeProgressionMatches(
			saveYourTearsHooktheory,
			coreProgressions
		);
		const matchesUg = computeProgressionMatches(
			saveYourTearsUg,
			coreProgressions
		);
		const htCount = matchesHt.find(
			(m) => m.name === darkDooWop.name
		)?.matchCount;
		const ugCount = matchesUg.find(
			(m) => m.name === darkDooWop.name
		)?.matchCount;
		expect(htCount).toBe(ugCount);
	});
});

// Travis Scott "Highest in the Room" — the outro is:
//   vi · i · v · VI · iv · i · v · VI · iv · i
// i-v-VI-iv appears at positions 1-4 and 5-8: 2 non-overlapping matches.
// i-v-VI-iv-i appears at positions 1-5 and 5-9, sharing position 5, so only 1
// non-overlapping instance. Before the fix, computeStatsForParsedProgression
// counted raw (overlapping) matches, causing i-v-VI-iv-i to show "2×" in the UI.
//
// Both the section and the search are built with romanTokensToParsedProgression
// so their abstract (interval-based) representations are consistent.

const OUTRO_TOKENS = ["vi", "i", "v", "VI", "iv", "i", "v", "VI", "iv", "i"];

const makeTokenSection = (romanTokens: string[]): SongSection => ({
	label: null,
	chords: romanTokens,
	romanTokens,
	parsedProgression: romanTokensToParsedProgression(romanTokens) ?? [],
	keyLabel: null,
	scale: "minor"
});

const outroTokenSong: GroupedSong = {
	songKey: "travis-scott__highest-in-the-room",
	title: "Highest in the Room",
	artists: ["Travis Scott"],
	keyLabel: null,
	sections: [makeTokenSection(OUTRO_TOKENS)]
};

const parse = (progression: string) =>
	romanTokensToParsedProgression(progression.split("-"))!;

describe("computeStatsForParsedProgression — overlapping match regression (highest in the room)", () => {
	it("counts i-v-VI-iv-i as only 1 non-overlapping match in the outro", () => {
		const stats = computeStatsForParsedProgression(
			outroTokenSong,
			parse("i-v-VI-iv-i")
		);
		expect(stats.matchCount).toBe(1);
	});

	it("counts i-v-VI-iv as 2 non-overlapping matches in the outro", () => {
		const stats = computeStatsForParsedProgression(
			outroTokenSong,
			parse("i-v-VI-iv")
		);
		expect(stats.matchCount).toBe(2);
	});

	it("outro coverage is higher for i-v-VI-iv than i-v-VI-iv-i", () => {
		const statsLong = computeStatsForParsedProgression(
			outroTokenSong,
			parse("i-v-VI-iv-i")
		);
		const statsShort = computeStatsForParsedProgression(
			outroTokenSong,
			parse("i-v-VI-iv")
		);
		expect(statsShort.coveragePercent).toBeGreaterThan(
			statsLong.coveragePercent
		);
	});
});

describe("parseCoreProgressions", () => {
	it("returns an entry for every non-self-repeating core progression that parses", () => {
		const parsed = parseCoreProgressions(coreProgressions);
		expect(parsed.length).toBeGreaterThan(0);
		expect(
			parsed.every((p) => Array.isArray(p.parsed) && p.parsed.length > 0)
		).toBe(true);
	});

	it("carries the original chordProgression string through", () => {
		const parsed = parseCoreProgressions(coreProgressions);
		const axisEntry = parsed.find((p) => p.chordProgression === "I-V-vi-IV");
		expect(axisEntry).toBeDefined();
	});
});

describe("findMatchingCoreProgressionsForSong", () => {
	it("returns the burnin-up progression for the burnin-up song (4 matches >= 2)", () => {
		const parsedCore = parseCoreProgressions(coreProgressions);
		const matches = findMatchingCoreProgressionsForSong(
			{ ...saveYourTearsHooktheory, songKey: "jonas-brothers__burnin-up" },
			parsedCore
		);
		// save your tears matches "dark doo wop" I-vi-iii-V pattern — check it appears
		expect(matches).toContain("I-vi-iii-V");
	});

	it("does not include progressions with only 1 match (below MIN_PROGRESSION_OCCURRENCES)", () => {
		const singleMatchSection = makeSection([
			C_MAJOR,
			A_MINOR,
			E_MINOR,
			G_MAJOR
		]);
		const singleMatchSong: GroupedSong = {
			songKey: "test__single-match",
			title: "Test",
			artists: ["Test"],
			keyLabel: "C major",
			sections: [singleMatchSection]
		};
		const parsedCore = parseCoreProgressions(coreProgressions);
		const matches = findMatchingCoreProgressionsForSong(
			singleMatchSong,
			parsedCore
		);
		expect(matches).not.toContain("I-vi-iii-V");
	});
});

describe("buildProgressionMatchRates", () => {
	it("returns empty objects when totalSongs is 0", () => {
		expect(buildProgressionMatchRates([["I-V-vi-IV"]], 0)).toEqual({
			progressionMatchRates: {},
			progressionMatchCounts: {}
		});
	});

	it("computes the correct percentage without rounding sub-1% values away", () => {
		const { progressionMatchRates, progressionMatchCounts } =
			buildProgressionMatchRates(
				[["I-V-vi-IV"], ["I-V-vi-IV"], ["I-vi-IV-V"]],
				4
			);
		expect(progressionMatchRates["I-V-vi-IV"]).toBe(50);
		expect(progressionMatchRates["I-vi-IV-V"]).toBe(25);
		expect(progressionMatchCounts["I-V-vi-IV"]).toBe(2);
		expect(progressionMatchCounts["I-vi-IV-V"]).toBe(1);
	});

	it("preserves fractional percentages below 1%", () => {
		const { progressionMatchRates, progressionMatchCounts } =
			buildProgressionMatchRates([["I-V-vi-IV"]], 1000);
		expect(progressionMatchRates["I-V-vi-IV"]).toBe(0.1);
		expect(progressionMatchCounts["I-V-vi-IV"]).toBe(1);
	});

	it("progressions absent from all lists are not present in the result", () => {
		const { progressionMatchRates } = buildProgressionMatchRates(
			[["I-V-vi-IV"]],
			2
		);
		expect(progressionMatchRates["I-vi-iii-V"]).toBeUndefined();
	});
});

describe("formatMatchRatePercent", () => {
	it("shows integers for rates at or above 1%", () => {
		expect(formatMatchRatePercent(50)).toBe("50");
		expect(formatMatchRatePercent(1)).toBe("1");
	});

	it("shows up to two decimal places for non-zero rates below 1%", () => {
		expect(formatMatchRatePercent(0.1)).toBe("0.1");
		expect(formatMatchRatePercent(0.12)).toBe("0.12");
		expect(formatMatchRatePercent(0.125)).toBe("0.13");
	});

	it("shows 0 for zero rates", () => {
		expect(formatMatchRatePercent(0)).toBe("0");
	});
});

const makeRomanSection = (romanTokens: string[]): SongSection => ({
	label: null,
	chords: romanTokens,
	romanTokens,
	parsedProgression: romanTokensToParsedProgression(romanTokens, "major") ?? [],
	keyLabel: null,
	scale: "major"
});

const whatchaSayStyleSection = ["IV", "I", "vi", "V", "IV", "I", "vi"];

const gapOnlyFixtureSong: GroupedSong = {
	songKey: "test__gap-only",
	title: "Gap Only Fixture",
	artists: ["Tester"],
	keyLabel: null,
	sections: [
		makeRomanSection(whatchaSayStyleSection),
		makeRomanSection(whatchaSayStyleSection)
	]
};

const coreOccupiedCoverage = gapOnlyFixtureSong.sections.map(() => [3, 4, 5]);

describe("computeGapOnlyStats — intact instances in gaps", () => {
	it("counts IV-I-vi only at opening positions outside core coverage", () => {
		const parsed = romanTokensToParsedProgression(["IV", "I", "vi"], "major")!;
		const stats = computeGapOnlyStats(
			gapOnlyFixtureSong,
			parsed,
			coreOccupiedCoverage
		);
		expect(stats.matchCount).toBe(2);
		const gapOnlyCoverage = computeGapOnlyCoveredPositionsBySection(
			gapOnlyFixtureSong,
			parsed,
			coreOccupiedCoverage
		);
		for (const sectionPositions of gapOnlyCoverage) {
			expect(sectionPositions).toEqual([0, 1, 2]);
		}
	});

	it("returns zero gap-only matches for vi-V-IV when every instance straddles core", () => {
		const parsed = romanTokensToParsedProgression(["vi", "V", "IV"], "major")!;
		const stats = computeGapOnlyStats(
			gapOnlyFixtureSong,
			parsed,
			coreOccupiedCoverage
		);
		expect(stats.matchCount).toBe(0);
	});

	it("never returns positions that are already occupied", () => {
		const parsed = romanTokensToParsedProgression(["IV", "I", "vi"], "major")!;
		const gapOnlyCoverage = computeGapOnlyCoveredPositionsBySection(
			gapOnlyFixtureSong,
			parsed,
			coreOccupiedCoverage
		);
		for (const [sectionIndex, sectionPositions] of gapOnlyCoverage.entries()) {
			for (const position of sectionPositions) {
				expect(coreOccupiedCoverage[sectionIndex]).not.toContain(position);
			}
		}
	});
});
