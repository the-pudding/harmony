import { describe, expect, it } from "vitest";
import coreProgressions from "$data/core-progressions.js";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";
import type { GroupedSong, SongSection } from "../../../../data/songBrowser.js";
import {
	computeProgressionMatches,
	computeStatsForParsedProgression,
	getSectionMatches
} from "./progressionMatchAnalysis.js";
import { computeGapFillProgressionMatches } from "./gapFillProgressionAnalysis.js";
import { selectFinalProgressions } from "./finalProgressionSelection.js";
import { emptyCoverage } from "./greedyProgressionSelection.js";

// Lady Gaga "Dope" — the chorus loops Isus2·V·Vsus4·vi·IV (over a held I). The
// HookTheory transcription keeps every suspension, so as written the chords are:
//   I · Isus2 · V · Vsus4 · vi · IV   (×4)
// Roman tokens are stored WITHOUT the suspension (base quality), exactly as the
// build pipeline emits them; only the parsed chords carry the sus suffixes.
const EXTENSION_LOOP = ["I", "Isus2", "V", "Vsus4", "vi", "IV"];
const BASE_ROMAN_LOOP = ["I", "I", "V", "V", "vi", "IV"];
const CHORUS_REPEATS = 4;

const repeat = <T>(items: T[], times: number): T[] =>
	Array.from({ length: times }, () => items).flat();

const makeExtensionSection = (
	extensionTokens: string[],
	baseRomanTokens: string[]
): SongSection => ({
	label: "Chorus",
	chords: extensionTokens,
	romanTokens: baseRomanTokens,
	parsedProgression:
		romanTokensToParsedProgression(extensionTokens, "major") ?? [],
	keyLabel: "Eb major",
	scale: "major"
});

const dopeSong: GroupedSong = {
	songKey: "lady-gaga__dope",
	title: "Dope",
	artists: ["Lady Gaga"],
	keyLabel: "Eb major",
	sections: [
		makeExtensionSection(
			repeat(EXTENSION_LOOP, CHORUS_REPEATS),
			repeat(BASE_ROMAN_LOOP, CHORUS_REPEATS)
		)
	]
};

const parse = (chordProgression: string) =>
	romanTokensToParsedProgression(chordProgression.split("-"), "major")!;

const chordProgressionsIn = (
	matches: { chordProgression: string }[]
): string[] => matches.map((match) => match.chordProgression);

const hasAdjacentDuplicate = (chordProgression: string): boolean => {
	const tokens = chordProgression.split("-");
	return tokens.some(
		(token, index) => index > 0 && token === tokens[index - 1]
	);
};

describe("dope regression — extensions ignored and repeats collapsed", () => {
	it("reads Isus2·V·Vsus4 as I·V, not I·V·V", () => {
		const asThreeChords = computeStatsForParsedProgression(
			dopeSong,
			parse("I-V-V")
		);
		const asTwoChords = computeStatsForParsedProgression(
			dopeSong,
			parse("I-V")
		);
		expect(asThreeChords).toEqual(asTwoChords);
	});

	it("a single I·Isus2·V·Vsus4 slice matches I-V while still covering all four chords", () => {
		const section = makeExtensionSection(
			["I", "Isus2", "V", "Vsus4"],
			["I", "I", "V", "V"]
		);
		// One match, spanning every original position so the display still shows
		// the suspensions — but it is read as the two-chord progression I·V.
		expect(getSectionMatches(section, parse("I-V"))).toEqual([
			{ start: 0, length: 4 }
		]);
		// Searching the un-collapsed "I-V-V" resolves to exactly the same match.
		expect(getSectionMatches(section, parse("I-V-V"))).toEqual([
			{ start: 0, length: 4 }
		]);
	});

	it("recognizes the whole chorus as axis of awesome (I-V-vi-IV) at 100% coverage", () => {
		const axis = computeProgressionMatches(dopeSong, coreProgressions).find(
			(match) => match.name === "axis of awesome"
		);
		expect(axis).toBeDefined();
		expect(axis!.matchCount).toBe(CHORUS_REPEATS);
		expect(axis!.coveragePercent).toBe(100);
	});

	it("never surfaces the spurious I-V-V anywhere in the final selection", () => {
		const result = selectFinalProgressions(dopeSong, coreProgressions);
		const everyProgression = chordProgressionsIn([
			...result.coreMatches,
			...result.coreSelected,
			...result.gapCandidates,
			...result.gapSelected
		]);
		expect(everyProgression).not.toContain("I-V-V");
		expect(result.explainedPercent).toBe(100);
	});

	it("gap-fill candidates are collapsed: no spurious I-V-V, and I-V-vi is core so excluded", () => {
		const gapProgressions = chordProgressionsIn(
			computeGapFillProgressionMatches(dopeSong, emptyCoverage(dopeSong))
		);
		expect(gapProgressions).not.toContain("I-V-vi");
		expect(gapProgressions).not.toContain("I-V-V");
		for (const chordProgression of gapProgressions) {
			expect(hasAdjacentDuplicate(chordProgression)).toBe(false);
		}
	});
});
