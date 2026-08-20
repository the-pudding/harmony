import { describe, expect, it } from "vitest";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";
import type { GroupedSong, SongSection } from "../../../../data/songBrowser.js";
import type { ProgressionWithMatchStats } from "./progressionMatchAnalysis.js";
import { matchHighlightForCoreProgression } from "../components/progressionColors.js";
import { selectCoreProgressions } from "./coreProgressionSelection.js";
import {
	extendCoreProgressionsPastPrefix,
	EXTENSION_CONSISTENCY_MIN_PERCENT
} from "./coreProgressionExtension.js";

const makeSection = (
	romanTokens: string[],
	label: string | null = null
): SongSection => ({
	label,
	chords: romanTokens,
	romanTokens,
	parsedProgression: romanTokensToParsedProgression(romanTokens, "minor") ?? [],
	keyLabel: null,
	scale: "minor"
});

const makeSong = (
	sections: SongSection[],
	songKey = "test__extension"
): GroupedSong => ({
	songKey,
	title: "Extension Fixture",
	artists: ["Tester"],
	keyLabel: null,
	sections
});

const makeCoreCandidate = (
	chordProgression: string,
	matchRomanNumeralsExactly = false
): ProgressionWithMatchStats => {
	const parsed = romanTokensToParsedProgression(
		chordProgression.split("-"),
		"minor"
	)!;
	return {
		name: "test core",
		chordProgression,
		parsedProgression: parsed,
		scale: "minor",
		description: "",
		matchCount: 0,
		coveragePercent: 0,
		matchRomanNumeralsExactly,
		...matchHighlightForCoreProgression(true, chordProgression, "test core")
	};
};

const repeat = (tokens: string[], times: number): string[] =>
	Array.from({ length: times }, () => tokens).flat();

const extendedChordProgressions = (
	song: GroupedSong,
	core: ProgressionWithMatchStats[]
): string[] =>
	extendCoreProgressionsPastPrefix(
		song,
		selectCoreProgressions(song, core)
	).extended.map((match) => match.chordProgression);

describe("extendCoreProgressionsPastPrefix", () => {
	it("extends a core winner when its trailing chord is unanimous", () => {
		const song = makeSong([
			makeSection(repeat(["i", "VI", "III", "iv"], 5))
		]);
		const result = extendCoreProgressionsPastPrefix(
			song,
			selectCoreProgressions(song, [makeCoreCandidate("i-VI-III")])
		);
		expect(result.extended.map((m) => m.chordProgression)).toEqual([
			"i-VI-III-iv"
		]);
		expect(result.extended[0].isCoreProgression).toBe(false);
		expect(result.extended[0].name).toBe("");
		expect(result.coreSelected).toHaveLength(0);
	});

	it("never extends a 4-chord core winner, even with an otherwise-unanimous trailing chord", () => {
		// Same shape as the clean-extension test above, but starting from a
		// 4-chord winner (i-VI-III-iv) instead of a 3-chord one — only 3-chord
		// winners are eligible to extend (Forever Young regression: axis of
		// awesome, I-V-vi-IV, must never be pushed to 5-6 chords).
		const song = makeSong([
			makeSection(repeat(["i", "VI", "III", "iv", "v"], 5))
		]);
		const extended = extendedChordProgressions(song, [
			makeCoreCandidate("i-VI-III-iv")
		]);
		expect(extended).toEqual([]);
	});

	it("still extends using the remaining instances when one is cut off by a section boundary", () => {
		const song = makeSong([
			...Array.from({ length: 5 }, () => makeSection(["i", "VI", "III", "iv"])),
			// Fills the whole section — no room to extend, must abstain. With 5
			// extending cleanly, dropping this one instance is still a net win:
			// 5 * 4 = 20 covered chords beats the original 6 * 3 = 18.
			makeSection(["i", "VI", "III"])
		]);
		const extended = extendedChordProgressions(song, [
			makeCoreCandidate("i-VI-III")
		]);
		expect(extended).toEqual(["i-VI-III-iv"]);
	});

	it("extends past a single dissenting instance right at the consistency threshold", () => {
		// 9 of 10 instances trail on "iv" (90%, exactly at the threshold).
		expect(EXTENSION_CONSISTENCY_MIN_PERCENT).toBe(90);
		const song = makeSong([
			makeSection([
				...repeat(["i", "VI", "III", "iv"], 9),
				"i",
				"VI",
				"III",
				"v"
			])
		]);
		const extended = extendedChordProgressions(song, [
			makeCoreCandidate("i-VI-III")
		]);
		expect(extended).toEqual(["i-VI-III-iv"]);
	});

	it("declines to extend into its own first chord, even when instances aren't adjacent (House of the Rising Sun shape)", () => {
		// Two non-adjacent instances of i-III-IV-VI, each followed by "i" (its
		// own tonic) — not self-claimed, since the instances aren't back-to-back,
		// so without a dedicated guard this would extend into i-III-IV-VI-i.
		const song = makeSong([
			makeSection(["i", "III", "IV", "VI", "i", "v", "i", "III", "IV", "VI", "i", "v"])
		]);
		const extended = extendedChordProgressions(song, [
			makeCoreCandidate("i-III-IV-VI")
		]);
		expect(extended).toEqual([]);
	});

	it("declines when the trailing chord is evenly split with no plurality above threshold", () => {
		const song = makeSong([
			makeSection([
				...repeat(["i", "VI", "III", "iv"], 5),
				...repeat(["i", "VI", "III", "v"], 5)
			])
		]);
		const extended = extendedChordProgressions(song, [
			makeCoreCandidate("i-VI-III")
		]);
		expect(extended).toEqual([]);
	});

	it("declines a bare repeating vamp with no consistent trailing chord (Stay With Me shape)", () => {
		// Every instance's neighbor is the start of its own next instance, which
		// is already core-claimed by the same winner — nothing is eligible to vote.
		const song = makeSong([makeSection(repeat(["i", "VI", "III"], 4))]);
		const extended = extendedChordProgressions(song, [
			makeCoreCandidate("i-VI-III")
		]);
		expect(extended).toEqual([]);
	});

	it("chains multiple rounds up to the full unit, not just one chord", () => {
		const song = makeSong([
			makeSection(repeat(["i", "VI", "III", "iv", "v", "III"], 2))
		]);
		const extended = extendedChordProgressions(song, [
			makeCoreCandidate("i-VI-III")
		]);
		expect(extended).toEqual(["i-VI-III-iv-v-III"]);
	});

	it("declines when only a couple of eligible instances would extend, even unanimously, because total coverage would drop", () => {
		// 8 clean bare-vamp instances (self-claimed, ineligible) plus exactly 2
		// instances elsewhere that do have a free, consistent trailing chord.
		// 2 supportive * 4 chords (8) does not beat 10 original instances * 3 (30).
		const song = makeSong([
			makeSection(repeat(["i", "VI", "III"], 8)),
			makeSection(["i", "VI", "III", "iv"]),
			makeSection(["i", "VI", "III", "iv"])
		]);
		const extended = extendedChordProgressions(song, [
			makeCoreCandidate("i-VI-III")
		]);
		expect(extended).toEqual([]);
	});

	it("inherits matchRomanNumeralsExactly from the parent winner", () => {
		const song = makeSong([
			makeSection(repeat(["i", "VI", "III", "iv"], 3))
		]);
		const result = extendCoreProgressionsPastPrefix(
			song,
			selectCoreProgressions(song, [makeCoreCandidate("i-VI-III", true)])
		);
		expect(result.extended[0].matchRomanNumeralsExactly).toBe(true);
	});

	it("promotes to the already-registered core progression instead of declining or minting a duplicate", () => {
		// i-VI-III-VII is the real, registered "poker face (chorus)" progression.
		// When the chain consistently lands on it, it should be credited as
		// that named core progression, not silently dropped back to the
		// shorter bare winner and not minted as an anonymous duplicate.
		const song = makeSong([
			makeSection(repeat(["i", "VI", "III", "VII"], 5))
		]);
		const result = extendCoreProgressionsPastPrefix(
			song,
			selectCoreProgressions(song, [makeCoreCandidate("i-VI-III")])
		);
		expect(result.extended).toEqual([]);
		expect(result.coreSelected).toHaveLength(1);
		expect(result.coreSelected[0].name).toBe("poker face (chorus)");
		expect(result.coreSelected[0].chordProgression).toBe("i-VI-III-VII");
		expect(result.coreSelected[0].isCoreProgression).toBe(true);
	});
});
