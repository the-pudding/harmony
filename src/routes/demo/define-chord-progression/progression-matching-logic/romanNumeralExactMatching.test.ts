import { describe, expect, it } from "vitest";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";
import type { GroupedSong, SongSection } from "../../../../data/songBrowser.js";
import {
	computeProgressionMatches,
	getSectionMatches
} from "./progressionMatchAnalysis.js";
import type { CoreProgression } from "$data/core-progressions.js";
import coreProgressions from "$data/core-progressions.js";

const makeSection = (
	romanTokens: string[],
	scale: "major" | "minor" = "major"
): SongSection => ({
	label: null,
	chords: romanTokens,
	romanTokens,
	parsedProgression:
		romanTokensToParsedProgression(romanTokens, scale) ?? [],
	keyLabel: null,
	scale
});

const makeSong = (sections: SongSection[]): GroupedSong => ({
	songKey: "test__exact-match",
	title: "Exact Match Fixture",
	artists: ["Tester"],
	keyLabel: null,
	sections
});

// i-VI-III in minor: pitch classes 0, 8, 3 (A, F, C in A minor)
const stayWithMeParsed = romanTokensToParsedProgression(
	["i", "VI", "III"],
	"minor"
)!;

// I-V-vi in major: pitch classes 0, 7, 9 (C, G, Am in C major)
const miniAxisParsed = romanTokensToParsedProgression(
	["I", "V", "vi"],
	"major"
)!;

describe("getSectionMatches — matchRomanNumeralsExactly", () => {
	describe("i-VI-III (stay with me)", () => {
		it("matches a minor section starting on the tonic", () => {
			const section = makeSection(
				["i", "VI", "III", "i", "VI", "III"],
				"minor"
			);
			const matches = getSectionMatches(section, stayWithMeParsed, true);
			expect(matches).toHaveLength(2);
		});

		it("does not match when the same intervals start on a non-tonic degree in a major section", () => {
			// Annie's Song shape: vi-IV-I appears inside a major section
			const section = makeSection(
				["IV", "V", "vi", "IV", "I", "vi", "IV", "I"],
				"major"
			);
			const matches = getSectionMatches(section, stayWithMeParsed, true);
			expect(matches).toHaveLength(0);
		});

		it("without the flag, the same major section matches on intervals alone", () => {
			const section = makeSection(
				["IV", "V", "vi", "IV", "I", "vi", "IV", "I"],
				"major"
			);
			const matches = getSectionMatches(section, stayWithMeParsed, false);
			expect(matches.length).toBeGreaterThan(0);
		});

		it("falls back to interval matching when romanTokens are empty", () => {
			const section: SongSection = {
				label: null,
				chords: [],
				romanTokens: [],
				parsedProgression:
					romanTokensToParsedProgression(["vi", "IV", "I"], "major") ?? [],
				keyLabel: null,
				scale: "major"
			};
			const matches = getSectionMatches(section, stayWithMeParsed, true);
			expect(matches.length).toBeGreaterThan(0);
		});

		it("accepts matches within a section where i appears mid-section, not just at position 0", () => {
			// "III" appears first but the match at position 1 (starting on "i") is valid
			const section = makeSection(
				["III", "i", "VI", "III", "i", "VI", "III"],
				"minor"
			);
			const matches = getSectionMatches(section, stayWithMeParsed, true);
			expect(matches.length).toBeGreaterThan(0);
			matches.forEach((m) => {
				expect(section.romanTokens[m.start]).toBe("i");
			});
		});
	});

	describe("I-V-vi ((mini)axis of awesome)", () => {
		it("matches a major section starting on I", () => {
			const section = makeSection(["I", "V", "vi", "I", "V", "vi"], "major");
			const matches = getSectionMatches(section, miniAxisParsed, true);
			expect(matches).toHaveLength(2);
		});

		it("does not match a minor section with the same deltas starting on III", () => {
			// III-VII-i in minor has same deltas [7,2] as I-V-vi in major
			const section = makeSection(
				["III", "VII", "i", "III", "VII", "i"],
				"minor"
			);
			const matches = getSectionMatches(section, miniAxisParsed, true);
			expect(matches).toHaveLength(0);
		});

		it("without the flag, the minor section also matches", () => {
			const section = makeSection(
				["III", "VII", "i", "III", "VII", "i"],
				"minor"
			);
			const matches = getSectionMatches(section, miniAxisParsed, false);
			expect(matches.length).toBeGreaterThan(0);
		});
	});
});

describe("computeProgressionMatches — stay with me vs Annie's Song regression", () => {
	const stayWithMe: CoreProgression = {
		name: "stay with me",
		chordProgression: "i-VI-III",
		scale: "minor",
		matchRomanNumeralsExactly: true,
		description: ""
	};

	it("matches a Stay With Me (A minor, i-VI-III) song", () => {
		const song = makeSong([
			makeSection(["i", "VI", "III", "i", "VI", "III"], "minor"),
			makeSection(["i", "VI", "III", "i", "VI", "III"], "minor")
		]);
		const matches = computeProgressionMatches(song, [stayWithMe]);
		expect(matches.some((m) => m.name === "stay with me")).toBe(true);
	});

	it("does not match an Annie's Song (D major, vi-IV-I) song", () => {
		// vi-IV-I in D major = same pitch-class intervals but wrong roman spelling
		const song = makeSong([
			makeSection(["vi", "IV", "I", "vi", "IV", "I"], "major"),
			makeSection(["vi", "IV", "I", "vi", "IV", "I"], "major")
		]);
		const matches = computeProgressionMatches(song, [stayWithMe]);
		expect(matches.some((m) => m.name === "stay with me")).toBe(false);
	});
});

describe("core-progressions data assertions", () => {
	it("'stay with me' is i-VI-III, minor, and matchRomanNumeralsExactly", () => {
		const p = coreProgressions.find((c) => c.name === "stay with me");
		expect(p).toBeDefined();
		expect(p!.chordProgression).toBe("i-VI-III");
		expect(p!.scale).toBe("minor");
		expect(p!.matchRomanNumeralsExactly).toBe(true);
	});

	it("'(mini)axis of awesome' is I-V-vi, major, and matchRomanNumeralsExactly", () => {
		const p = coreProgressions.find((c) => c.name === "(mini)axis of awesome");
		expect(p).toBeDefined();
		expect(p!.chordProgression).toBe("I-V-vi");
		expect(p!.scale).toBe("major");
		expect(p!.matchRomanNumeralsExactly).toBe(true);
	});
});
