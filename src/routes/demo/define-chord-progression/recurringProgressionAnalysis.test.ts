import { describe, expect, it } from "vitest";
import { romanTokensToParsedProgression } from "../../../chord-processing/romanNumerals.js";
import type { GroupedSong, SongSection } from "../progressions/songBrowser.js";
import { computeRecurringProgressionMatches } from "./recurringProgressionAnalysis.js";

const MIN_PROGRESSION_LENGTH = 3;
const MIN_OCCURRENCES = 2;

const makeSection = (romanTokens: string[]): SongSection => ({
	label: null,
	chords: romanTokens,
	romanTokens,
	parsedProgression: romanTokensToParsedProgression(romanTokens) ?? [],
	keyLabel: null
});

const makeSong = (sectionsTokens: string[][]): GroupedSong => ({
	songKey: "test",
	title: "Test Song",
	artists: ["Tester"],
	keyLabel: null,
	sections: sectionsTokens.map(makeSection)
});

const progressions = (song: GroupedSong): string[] =>
	computeRecurringProgressionMatches(song).map((match) => match.chordProgression);

// "I'm Yours" — Jason Mraz, in B major.
// Roman tokens after the build pipeline collapses V/3 -> V and dedupes the
// borrowed (IV) that repeats the plain IV.
const imYours = makeSong([
	// Bridge
	["I", "V", "vi", "V", "IV", "I", "V", "vi", "V", "IV"],
	// Verse
	["I", "V", "vi", "IV", "I", "V", "vi", "IV"],
	// Chorus
	["I", "V", "vi", "IV"]
]);

describe("computeRecurringProgressionMatches — I'm Yours", () => {
	it("surfaces the previously-missing I-V-vi", () => {
		expect(progressions(imYours)).toContain("I-V-vi");
	});

	it("still surfaces the progressions that already worked", () => {
		const found = progressions(imYours);
		expect(found).toContain("V-vi-IV");
		expect(found).toContain("vi-V-IV");
	});

	it("surfaces progressions even when they also exist in core progressions", () => {
		// I-V-vi-IV is the "axis of awesome" core progression; it should still
		// appear here because we now surface everything that recurs.
		expect(progressions(imYours)).toContain("I-V-vi-IV");
	});

	it("keeps sub-progressions alongside the longer progressions that contain them", () => {
		const found = progressions(imYours);
		expect(found).toContain("I-V-vi");
		expect(found).toContain("I-V-vi-IV");
	});
});

describe("computeRecurringProgressionMatches — invariants", () => {
	it("only returns progressions of at least the minimum length", () => {
		const matches = computeRecurringProgressionMatches(imYours);
		for (const match of matches) {
			expect(match.chordProgression.split("-").length).toBeGreaterThanOrEqual(
				MIN_PROGRESSION_LENGTH
			);
		}
	});

	it("only returns progressions that recur at least the minimum number of times", () => {
		const matches = computeRecurringProgressionMatches(imYours);
		expect(matches.length).toBeGreaterThan(0);
		for (const match of matches) {
			expect(match.matchCount).toBeGreaterThanOrEqual(MIN_OCCURRENCES);
		}
	});

	it("returns each distinct progression at most once", () => {
		const found = progressions(imYours);
		expect(new Set(found).size).toBe(found.length);
	});

	it("only returns progressions that parse into valid chords", () => {
		const matches = computeRecurringProgressionMatches(imYours);
		for (const match of matches) {
			expect(
				romanTokensToParsedProgression(match.chordProgression.split("-"))
			).not.toBeNull();
		}
	});
});

describe("computeRecurringProgressionMatches — recurrence detection", () => {
	it("surfaces a progression that appears exactly twice", () => {
		const song = makeSong([["I", "IV", "V", "I", "IV", "V"]]);
		expect(progressions(song)).toContain("I-IV-V");
	});

	it("does not surface a progression that appears only once", () => {
		const song = makeSong([["I", "IV", "V", "vi", "ii", "iii"]]);
		expect(computeRecurringProgressionMatches(song)).toHaveLength(0);
	});

	it("counts occurrences across separate sections", () => {
		const song = makeSong([
			["I", "vi", "IV"],
			["ii", "I", "vi", "IV"]
		]);
		expect(progressions(song)).toContain("I-vi-IV");
	});

	it("counts overlapping occurrences within a section", () => {
		// "I-V-I" occurs at index 0 and index 2 (overlapping).
		const song = makeSong([["I", "V", "I", "V", "I"]]);
		expect(progressions(song)).toContain("I-V-I");
	});

	it("ignores progressions shorter than the minimum length", () => {
		const song = makeSong([["I", "V", "I", "V"]]);
		// "I-V" recurs but is too short; nothing of length >= 3 recurs.
		expect(computeRecurringProgressionMatches(song)).toHaveLength(0);
	});

	it("returns nothing for a song with no repeating structure", () => {
		const song = makeSong([["I", "ii", "iii", "IV", "V", "vi"]]);
		expect(computeRecurringProgressionMatches(song)).toHaveLength(0);
	});

	it("surfaces long recurring progressions, not just the minimum length", () => {
		const song = makeSong([["I", "V", "vi", "IV", "I", "V", "vi", "IV"]]);
		expect(progressions(song)).toContain("I-V-vi-IV");
	});
});
