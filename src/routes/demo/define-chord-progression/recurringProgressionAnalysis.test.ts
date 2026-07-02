import { describe, expect, it } from "vitest";
import { romanTokensToParsedProgression } from "../../../chord-processing/romanNumerals.js";
import type { ParsedProgressionChord } from "../../../chord-processing/types.js";
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

// Build a section where the roman tokens intentionally disagree with the parsed
// chords (e.g. a slash-bass V/3 collapses to the token "V"), so we can prove
// the analysis reports the bass-aware match stats rather than raw token counts.
const makeSectionWithParsed = (
	romanTokens: string[],
	parsedProgression: ParsedProgressionChord[]
): SongSection => ({
	label: null,
	chords: romanTokens,
	romanTokens,
	parsedProgression,
	keyLabel: null
});

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

const TONIC = chord(0, "major");
const DOMINANT = chord(7, "major");
const DOMINANT_SLASH_THIRD = chord(7, "major", 11);
const SUBMEDIANT = chord(9, "minor");

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

	it("never returns progressions that occur 0 times or cover 0% of the song", () => {
		const matches = computeRecurringProgressionMatches(imYours);
		for (const match of matches) {
			expect(match.matchCount).toBeGreaterThan(0);
			expect(match.coveragePercent).toBeGreaterThan(0);
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

describe("computeRecurringProgressionMatches — bass-aware stats", () => {
	// Both dominant chords are inverted (V/3), so the plain "I-V-vi" search never
	// truly matches: the roman tokens repeat but the actual chords do not.
	const invertedDominantSong: GroupedSong = {
		songKey: "test",
		title: "Test Song",
		artists: ["Tester"],
		keyLabel: null,
		sections: [
			makeSectionWithParsed(
				["I", "V", "vi", "I", "V", "vi"],
				[
					TONIC,
					DOMINANT_SLASH_THIRD,
					SUBMEDIANT,
					TONIC,
					DOMINANT_SLASH_THIRD,
					SUBMEDIANT
				]
			)
		]
	};

	it("filters out roman-token repeats that do not actually recur as chords", () => {
		expect(progressions(invertedDominantSong)).not.toContain("I-V-vi");
	});

	// One dominant is inverted and one is root position, so "I-V-vi" only truly
	// recurs once — below the minimum — and must not be shown as a 1x/low row.
	const mixedDominantSong: GroupedSong = {
		songKey: "test",
		title: "Test Song",
		artists: ["Tester"],
		keyLabel: null,
		sections: [
			makeSectionWithParsed(
				["I", "V", "vi", "I", "V", "vi"],
				[TONIC, DOMINANT_SLASH_THIRD, SUBMEDIANT, TONIC, DOMINANT, SUBMEDIANT]
			)
		]
	};

	it("does not surface progressions whose real chords recur only once", () => {
		expect(progressions(mixedDominantSong)).not.toContain("I-V-vi");
	});
});
