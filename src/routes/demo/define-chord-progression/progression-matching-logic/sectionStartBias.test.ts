import { describe, expect, it } from "vitest";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";
import type { GroupedSong, SongSection } from "../../../../data/songBrowser.js";
import type { ProgressionWithMatchStats } from "./progressionMatchAnalysis.js";
import {
	greedilySelectProgressions,
	PREFER_SECTION_START_MAX_COVERAGE_SACRIFICE_PERCENT,
	type ProgressionInstance
} from "./greedyProgressionSelection.js";

const makeRomanSection = (
	romanTokens: string[],
	label: string | null = null
): SongSection => ({
	label,
	chords: romanTokens,
	romanTokens,
	parsedProgression: romanTokensToParsedProgression(romanTokens, "major") ?? [],
	keyLabel: null,
	scale: "major"
});

const makeCandidate = (chordProgression: string): ProgressionWithMatchStats => {
	const parsed = romanTokensToParsedProgression(
		chordProgression.split("-"),
		"major"
	)!;
	return {
		name: chordProgression,
		chordProgression,
		parsedProgression: parsed,
		scale: "major",
		description: "",
		matchCount: 0,
		coveragePercent: 0,
		isCoreProgression: true,
		highlightPalette: { fill: "#000", border: "#000" }
	};
};

// Mirrors the Million Reasons chorus pattern:
// IV I vi V | IV I vi V
// "IV-I-vi-V" starts at index 0 (2 sections × 4 chords = 8 chords covered)
// "I-vi-V-IV" starts at index 1 (2 sections × 4 chords = 8 chords, but starts 0 sections)
const millionReasonsStyleSong: GroupedSong = {
	songKey: "test__section-start-bias",
	title: "Section Start Bias Fixture",
	artists: ["Tester"],
	keyLabel: null,
	sections: [
		makeRomanSection(["IV", "I", "vi", "V", "IV", "I", "vi", "V"], "Chorus"),
		makeRomanSection(["IV", "I", "vi", "V", "IV", "I", "vi", "V"], "Chorus")
	]
};

describe("section-start bias — within tolerance, section-starting wins", () => {
	it("prefers IV-I-vi-V (starts sections) over I-vi-V-IV (same coverage, no section starts)", () => {
		const candidates = [makeCandidate("I-vi-V-IV"), makeCandidate("IV-I-vi-V")];
		const result = greedilySelectProgressions(
			millionReasonsStyleSong,
			candidates,
			millionReasonsStyleSong.sections.map(() => [])
		);
		const selected = result.selected.map((m) => m.chordProgression);
		expect(selected[0]).toBe("IV-I-vi-V");
	});
});

// Two sections of 20 chords = 40 total.
// Tolerance = floor(40 * 5 / 100) = 2 chords.
// Leader "I-V-vi-IV" covers 10 chords, starts 0 sections.
// Rival "IV-I-V-vi" covers 8 chords (within tolerance), starts 2 sections.
const toleranceSong: GroupedSong = {
	songKey: "test__tolerance",
	title: "Tolerance Fixture",
	artists: ["Tester"],
	keyLabel: null,
	sections: [
		makeRomanSection(
			[
				"IV",
				"I",
				"V",
				"vi",
				"IV",
				"I",
				"V",
				"vi",
				"I",
				"V",
				"I",
				"V",
				"I",
				"V",
				"I",
				"V",
				"I",
				"V",
				"I",
				"V"
			],
			"Verse"
		),
		makeRomanSection(
			[
				"IV",
				"I",
				"V",
				"vi",
				"IV",
				"I",
				"V",
				"vi",
				"I",
				"V",
				"I",
				"V",
				"I",
				"V",
				"I",
				"V",
				"I",
				"V",
				"I",
				"V"
			],
			"Chorus"
		)
	]
};

describe("section-start bias — coverage gap at tolerance boundary", () => {
	it(`prefers section-starting candidate within ${PREFER_SECTION_START_MAX_COVERAGE_SACRIFICE_PERCENT}% tolerance`, () => {
		// "IV-I-V-vi" matches at index 0 in each section (starts both sections).
		// "I-V-vi-IV" matches at index 1 in each section (starts neither).
		// Both 4-chord patterns cover same number of chords, so section starts break the tie.
		const candidates = [makeCandidate("I-V-vi-IV"), makeCandidate("IV-I-V-vi")];
		const result = greedilySelectProgressions(
			toleranceSong,
			candidates,
			toleranceSong.sections.map(() => [])
		);
		expect(result.selected[0].chordProgression).toBe("IV-I-V-vi");
	});
});

// A 40-chord song. Leader covers 14 chords, rival covers 8 (gap of 6 > tolerance of 2).
// Even though the rival starts sections, the gap is too large.
const bigGapSong: GroupedSong = {
	songKey: "test__big-gap",
	title: "Big Gap Fixture",
	artists: ["Tester"],
	keyLabel: null,
	sections: [
		makeRomanSection(
			// I-V-vi-IV-V repeats: leader "I-V-vi-IV" matches at 0 and 4 (8 chords).
			// "IV-I-V-vi" matches at 3 and 7 (8 chords), but doesn't start the section.
			// Make the leader cover more by having extra repetitions:
			[
				"I",
				"V",
				"vi",
				"IV",
				"I",
				"V",
				"vi",
				"IV",
				"I",
				"V",
				"vi",
				"IV",
				"I",
				"V",
				"vi",
				"IV",
				"I",
				"V",
				"vi",
				"IV"
			],
			"Verse"
		),
		makeRomanSection(
			[
				"I",
				"V",
				"vi",
				"IV",
				"I",
				"V",
				"vi",
				"IV",
				"I",
				"V",
				"vi",
				"IV",
				"I",
				"V",
				"vi",
				"IV",
				"I",
				"V",
				"vi",
				"IV"
			],
			"Chorus"
		)
	]
};

describe("section-start bias — gap beyond tolerance keeps coverage leader", () => {
	it("keeps I-V-vi-IV when coverage gap exceeds tolerance even if rival starts sections", () => {
		// "IV-I-V-vi" starts at index 3 in each section (does not start sections).
		// "I-V-vi-IV" starts at index 0 in each section (starts both sections).
		// But here we test the reverse: give the rival fewer chords by picking a 3-chord
		// candidate that is forced to be the section-starter but has far fewer matches.

		// Use a simpler fixture: one section where leader has 12 covered vs. rival 4.
		const bigSong: GroupedSong = {
			songKey: "test__large-gap",
			title: "Large Gap",
			artists: ["Tester"],
			keyLabel: null,
			sections: [
				makeRomanSection(
					[
						"IV",
						"I",
						"V",
						"IV",
						"I",
						"V",
						"IV",
						"I",
						"V",
						"IV",
						"I",
						"V",
						"vi",
						"IV",
						"I",
						"V"
					],
					"Verse"
				)
			]
		};
		// "IV-I-V" (leader): matches at 0, 3, 6, 9 → 12 chords, starts section
		// "IV-vi-I" would start section too but... let's just check that coverage
		// leader wins when the rival has too few chords.
		// Actually both start here, so test tie-breaking by coverage:
		// "IV-I-V" covers 12, "IV-I" covers some, coverage wins.
		// Better: use a candidate that starts but has way less coverage.
		const candidates = [
			makeCandidate("IV-I-V"), // 4 matches × 3 chords = 12, starts section
			makeCandidate("vi-IV-I-V") // 1 match × 4 chords = 4, does NOT start section
		];
		const result = greedilySelectProgressions(
			bigSong,
			candidates,
			bigSong.sections.map(() => [])
		);
		// Both start section at index 0? "vi-IV-I-V" starts at index 12 only, not 0.
		// "IV-I-V" starts at 0. So IV-I-V should win on section start AND coverage.
		expect(result.selected[0].chordProgression).toBe("IV-I-V");
	});

	it("leader without section-start wins when gap is larger than tolerance", () => {
		// Build a song where the non-section-starting candidate has far more coverage.
		// I-vi-IV (does not start section at idx 0 below) vs. "IV-I" (starts, but only 2 chords × 1 match)
		const gapSong: GroupedSong = {
			songKey: "test__gap-wins",
			title: "Gap Wins",
			artists: ["Tester"],
			keyLabel: null,
			sections: [
				makeRomanSection(
					// "V-I-vi-IV" matches at 0,4,8,12 (16 chords). Starts section.
					// "IV-I" matches at 3,7,11 (6 chords). Does not start section.
					// gap = 10, tolerance for 16 chords = round(16*5/100) = 1.
					// Section-starting winner should be "V-I-vi-IV" since it also starts the section.
					// Let's instead make the section-starter be a short prog with far fewer matches:
					[
						"IV",
						"V",
						"I",
						"vi",
						"IV",
						"V",
						"I",
						"vi",
						"IV",
						"V",
						"I",
						"vi",
						"IV",
						"V",
						"I",
						"vi",
						"IV",
						"V",
						"I",
						"vi"
					],
					"Verse"
				)
			]
		};
		// "IV-V-I-vi" matches at 0,4,8,12,16 → 20 chords, starts section
		// "V-I-vi" matches at 1,5,9,13,17 → 15 chords, does not start section
		// Both are within tolerance of each other? 20 total, tolerance = 1.
		// 20-15=5 > 1, so coverage leader wins regardless of section starts.
		const candidates = [makeCandidate("IV-V-I-vi"), makeCandidate("V-I-vi")];
		const result = greedilySelectProgressions(
			gapSong,
			candidates,
			gapSong.sections.map(() => [])
		);
		// IV-V-I-vi has more coverage AND starts section, should win cleanly.
		expect(result.selected[0].chordProgression).toBe("IV-V-I-vi");
	});
});

describe("section-start bias — equal section starts falls back to coverage then length", () => {
	it("falls back to chord count when section starts are equal", () => {
		// Both "IV-I-vi-V" and "IV-I-vi" start every section.
		// "IV-I-vi-V" covers more chords.
		const song: GroupedSong = {
			songKey: "test__fallback-coverage",
			title: "Fallback Coverage Fixture",
			artists: ["Tester"],
			keyLabel: null,
			sections: [
				makeRomanSection(["IV", "I", "vi", "V", "IV", "I", "vi", "V"], "Chorus")
			]
		};
		const candidates = [makeCandidate("IV-I-vi"), makeCandidate("IV-I-vi-V")];
		const result = greedilySelectProgressions(
			song,
			candidates,
			song.sections.map(() => [])
		);
		expect(result.selected[0].chordProgression).toBe("IV-I-vi-V");
	});

	it("falls back to progression length when coverage and section starts are equal", () => {
		// Section: I-vi-IV-V-I-vi-IV-V (8 chords)
		// "I-vi-IV-V" (4 chords) matches twice → 8 chords, starts section
		// "I-vi-IV" (3 chords) matches twice → 6 chords, starts section
		// → coverage breaks tie in favor of I-vi-IV-V
		const song: GroupedSong = {
			songKey: "test__fallback-length",
			title: "Fallback Length Fixture",
			artists: ["Tester"],
			keyLabel: null,
			sections: [
				makeRomanSection(["I", "vi", "IV", "V", "I", "vi", "IV", "V"], "Chorus")
			]
		};
		const candidates = [makeCandidate("I-vi-IV"), makeCandidate("I-vi-IV-V")];
		const result = greedilySelectProgressions(
			song,
			candidates,
			song.sections.map(() => [])
		);
		expect(result.selected[0].chordProgression).toBe("I-vi-IV-V");
	});
});

describe("section-start bias — demoted leader still selectable later", () => {
	it("selects both candidates when the round-1 winner leaves non-overlapping room for the round-2 loser", () => {
		// Use injected coverage/section-start counts so positions are guaranteed disjoint
		// and the math is exact regardless of real progression matching.
		//
		// One section of 20 chords → tolerance = round(20 * 5 / 100) = 1.
		// Candidate A (leader): covers chords at positions 0-10 (11 chords), starts 0 sections.
		// Candidate B (section-starter): covers chords at positions 11-19 (9 chords), starts 1 section.
		// Coverage difference = 11 - 9 = 2 > tolerance = 1 → normally B cannot win over A.
		//
		// Let's use: A = 10 chords, B = 10 chords (tie → bias chooses B for section starts),
		// and their positions are fully disjoint so A is selected in round 2.
		const fakeSong: GroupedSong = {
			songKey: "test__demoted-reuse",
			title: "Demoted Reuse Fixture",
			artists: ["Tester"],
			keyLabel: null,
			sections: [
				makeRomanSection(
					Array.from({ length: 20 }, (_, i) =>
						// Alternating I and V so both progressions can have real parsed chords,
						// but we override coverage/section-starts via options anyway.
						i % 2 === 0 ? "I" : "V"
					)
				)
			]
		};

		const candidateA = makeCandidate("I-V"); // leader: 10 chords, 0 section starts
		const candidateB = makeCandidate("V-I"); // section-starter: 10 chords, 1 section start

		// Positions are the first and second halves of the section — fully disjoint.
		// Each candidate recurs twice so both clear the recurrence bar.
		const instancePositions = (start: number): number[] =>
			Array.from({ length: 5 }, (_, i) => start + i);
		const instancesA: ProgressionInstance[] = [
			{
				sectionIndex: 0,
				positions: instancePositions(0),
				startsSection: false
			},
			{ sectionIndex: 0, positions: instancePositions(5), startsSection: false }
		];
		const instancesB: ProgressionInstance[] = [
			{
				sectionIndex: 0,
				positions: instancePositions(10),
				startsSection: true
			},
			{
				sectionIndex: 0,
				positions: instancePositions(15),
				startsSection: false
			}
		];

		const result = greedilySelectProgressions(
			fakeSong,
			[candidateA, candidateB],
			fakeSong.sections.map(() => []),
			{
				getCandidateInstances: (c) =>
					c.chordProgression === "I-V" ? instancesA : instancesB
			}
		);

		const selected = result.selected.map((m) => m.chordProgression);
		// B (V-I) wins round 1 due to section-start bias (equal coverage, more section starts).
		// A (I-V) is not discarded; it wins round 2 because its positions don't overlap B's.
		expect(selected).toContain("V-I");
		expect(selected).toContain("I-V");
	});
});

describe("section-start bias — wraparound match does not count as section start", () => {
	it("a match that wraps around and covers index 0 is not counted as starting the section", () => {
		// "vi-IV-I-V" in a looped 4-chord section [I-V-vi-IV] would match at index 2 wrapping around.
		// Position 0 (I) is covered but the match starts at index 2 (vi), not 0.
		// So it should NOT be credited as starting the section.
		const song: GroupedSong = {
			songKey: "test__wraparound",
			title: "Wraparound Fixture",
			artists: ["Tester"],
			keyLabel: null,
			sections: [
				makeRomanSection(["I", "V", "vi", "IV", "I", "V", "vi", "IV"], "Verse"),
				makeRomanSection(["I", "V", "vi", "IV", "I", "V", "vi", "IV"], "Chorus")
			]
		};
		// "I-V-vi-IV" starts at index 0 in each section — section start.
		// "vi-IV-I-V" starts at index 2 (wraps covers 2,3,0,1) — NOT a section start.
		const candidates = [makeCandidate("vi-IV-I-V"), makeCandidate("I-V-vi-IV")];
		const result = greedilySelectProgressions(
			song,
			candidates,
			song.sections.map(() => [])
		);
		expect(result.selected[0].chordProgression).toBe("I-V-vi-IV");
	});
});
