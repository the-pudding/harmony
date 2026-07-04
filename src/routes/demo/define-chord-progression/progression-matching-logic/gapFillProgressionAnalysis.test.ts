import { describe, expect, it } from "vitest";
import coreProgressions from "$data/core-progressions.js";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";
import type { ParsedProgressionChord } from "../../../../chord-processing/types.js";
import type {
	GroupedSong,
	SongSection
} from "../../progressions/songBrowser.js";
import { computeGapFillProgressionMatches } from "./gapFillProgressionAnalysis.js";
import { selectFinalProgressions } from "./finalProgressionSelection.js";
import { emptyCoverage } from "./greedyProgressionSelection.js";
import { MIN_PROGRESSION_OCCURRENCES } from "./progressionMatchAnalysis.js";
import { MIN_PROGRESSION_LENGTH } from "./progressionConstraints.js";

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

const NOTES_PER_OCTAVE = 12;
const ROMAN_BASES = ["I", "II", "III", "IV", "V", "VI", "VII"];
const SCALE_INTERVALS: Record<string, number[]> = {
	major: [0, 2, 4, 5, 7, 9, 11],
	harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
	phrygianDominant: [0, 1, 4, 5, 7, 8, 10]
};

const makeModalSection = (
	romanTokens: string[],
	scale: keyof typeof SCALE_INTERVALS,
	tonicPitchClass = 0
): SongSection => {
	const parsedProgression = romanTokens.map((token) => {
		const degree = ROMAN_BASES.indexOf(token.toUpperCase()) + 1;
		const rootPitchClass =
			(tonicPitchClass + SCALE_INTERVALS[scale][degree - 1]) % NOTES_PER_OCTAVE;
		const suffix = token === token.toUpperCase() ? "major" : "minor";
		return chord(rootPitchClass, suffix);
	});
	return {
		label: null,
		chords: romanTokens,
		romanTokens,
		parsedProgression,
		keyLabel: null
	};
};

const gapProgressions = (song: GroupedSong): string[] =>
	computeGapFillProgressionMatches(song, emptyCoverage(song)).map(
		(match) => match.chordProgression
	);

const imYours = makeSong([
	["I", "V", "vi", "V", "IV", "I", "V", "vi", "V", "IV"],
	["I", "V", "vi", "IV", "I", "V", "vi", "IV"],
	["I", "V", "vi", "IV"]
]);

describe("computeGapFillProgressionMatches — I'm Yours", () => {
	it("surfaces the previously-missing I-V-vi", () => {
		expect(gapProgressions(imYours)).toContain("I-V-vi");
	});

	it("still surfaces the progressions that already worked", () => {
		const found = gapProgressions(imYours);
		expect(found).toContain("V-vi-IV");
		expect(found).toContain("vi-V-IV");
	});

	it("excludes core progressions from gap-fill candidates", () => {
		expect(gapProgressions(imYours)).not.toContain("I-V-vi-IV");
	});

	it("keeps sub-progressions alongside the longer progressions that contain them", () => {
		const found = gapProgressions(imYours);
		expect(found).toContain("I-V-vi");
		expect(found).not.toContain("I-V-vi-IV");
	});
});

describe("computeGapFillProgressionMatches — invariants", () => {
	it("only returns progressions of at least the minimum length", () => {
		const matches = computeGapFillProgressionMatches(imYours, emptyCoverage(imYours));
		for (const match of matches) {
			expect(match.chordProgression.split("-").length).toBeGreaterThanOrEqual(
				MIN_PROGRESSION_LENGTH
			);
		}
	});

	it("only returns progressions that recur at least the minimum number of times", () => {
		const matches = computeGapFillProgressionMatches(imYours, emptyCoverage(imYours));
		expect(matches.length).toBeGreaterThan(0);
		for (const match of matches) {
			expect(match.matchCount).toBeGreaterThanOrEqual(
				MIN_PROGRESSION_OCCURRENCES
			);
		}
	});

	it("never returns progressions that occur 0 times or cover 0% of the song", () => {
		const matches = computeGapFillProgressionMatches(imYours, emptyCoverage(imYours));
		for (const match of matches) {
			expect(match.matchCount).toBeGreaterThan(0);
			expect(match.coveragePercent).toBeGreaterThan(0);
		}
	});

	it("returns each distinct progression at most once", () => {
		const found = gapProgressions(imYours);
		expect(new Set(found).size).toBe(found.length);
	});

	it("only returns non-core progressions", () => {
		const matches = computeGapFillProgressionMatches(imYours, emptyCoverage(imYours));
		for (const match of matches) {
			expect(match.isCoreProgression).toBe(false);
		}
	});
});

describe("computeGapFillProgressionMatches — recurrence detection", () => {
	it("surfaces a progression that appears exactly twice", () => {
		const song = makeSong([["I", "IV", "V", "I", "IV", "V"]]);
		expect(gapProgressions(song)).toContain("I-IV-V");
	});

	it("does not surface a progression that appears only once", () => {
		const song = makeSong([["I", "IV", "V", "vi", "ii", "iii"]]);
		expect(computeGapFillProgressionMatches(song, emptyCoverage(song))).toHaveLength(
			0
		);
	});

	it("counts occurrences across separate sections", () => {
		const song = makeSong([
			["I", "vi", "IV"],
			["ii", "I", "vi", "IV"]
		]);
		expect(gapProgressions(song)).toContain("I-vi-IV");
	});

	it("counts overlapping occurrences within a section", () => {
		const song = makeSong([["I", "V", "I", "V", "I"]]);
		expect(gapProgressions(song)).toContain("I-V-I");
	});

	it("ignores progressions shorter than the minimum length", () => {
		const song = makeSong([["I", "V", "I", "V"]]);
		expect(computeGapFillProgressionMatches(song, emptyCoverage(song))).toHaveLength(
			0
		);
	});

	it("returns nothing for a song with no repeating structure", () => {
		const song = makeSong([["I", "ii", "iii", "IV", "V", "vi"]]);
		expect(computeGapFillProgressionMatches(song, emptyCoverage(song))).toHaveLength(
			0
		);
	});

	it("surfaces long recurring progressions, not just the minimum length", () => {
		const song = makeSong([["I", "V", "vi", "IV", "I", "V", "vi", "IV"]]);
		expect(gapProgressions(song)).not.toContain("I-V-vi-IV");
		expect(gapProgressions(song)).toContain("I-V-vi");
	});
});

describe("computeGapFillProgressionMatches — ignores slash bass", () => {
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

	it("surfaces progressions whose only difference is an inverted (slash) chord", () => {
		expect(gapProgressions(invertedDominantSong)).toContain("I-V-vi");
	});

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

	it("treats a slash chord and its root-position form as the same chord", () => {
		expect(gapProgressions(mixedDominantSong)).toContain("I-V-vi");
	});
});

describe("computeGapFillProgressionMatches — no self-repeating progressions", () => {
	it("never returns a progression that is its own unit repeated consecutively", () => {
		const matches = computeGapFillProgressionMatches(imYours, emptyCoverage(imYours));
		for (const match of matches) {
			const tokens = match.chordProgression.split("-");
			for (
				let blockLength = MIN_PROGRESSION_LENGTH;
				blockLength <= Math.floor(tokens.length / 2);
				blockLength++
			) {
				for (let start = 0; start + 2 * blockLength <= tokens.length; start++) {
					const block = tokens.slice(start, start + blockLength).join("-");
					const next = tokens
						.slice(start + blockLength, start + 2 * blockLength)
						.join("-");
					expect(block).not.toBe(next);
				}
			}
		}
	});

	it("the-weeknd pattern: excludes core I-vi-iii-V and the doubled I-vi-iii-V-I-vi-iii-V", () => {
		const saveYourTears = makeSong([
			["I", "vi", "iii", "V", "I", "vi", "iii", "V"],
			["I", "vi", "iii", "V", "I", "vi", "iii", "V"]
		]);
		const found = gapProgressions(saveYourTears);
		expect(found).not.toContain("I-vi-iii-V");
		expect(found).not.toContain("I-vi-iii-V-I-vi-iii-V");
	});

	it("IV-V vamp: excludes the core IV-V-IV-V and the doubled 8-chord form", () => {
		const vampSong = makeSong([
			["IV", "V", "IV", "V", "IV", "V", "IV", "V"],
			["IV", "V", "IV", "V", "IV", "V", "IV", "V"]
		]);
		const found = gapProgressions(vampSong);
		expect(found).not.toContain("IV-V-IV-V");
		expect(found).not.toContain("IV-V-IV-V-IV-V-IV-V");
	});
});

const montero: GroupedSong = {
	songKey: "test",
	title: "Montero (Call Me By Your Name)",
	artists: ["Lil Nas X"],
	keyLabel: null,
	sections: [
		makeModalSection(["V", "VI", "V", "VI"], "harmonicMinor"),
		makeModalSection(["V", "VI", "V", "VI", "V"], "harmonicMinor"),
		makeModalSection(
			["V", "VI", "V", "VI", "V", "VI", "V", "VI", "V"],
			"harmonicMinor"
		),
		makeModalSection(
			["I", "ii", "I", "ii", "I", "ii", "I", "ii", "I"],
			"phrygianDominant"
		)
	]
};

describe("computeGapFillProgressionMatches — modal songs (Montero)", () => {
	it("does not silently return zero matches for a modal song", () => {
		expect(
			computeGapFillProgressionMatches(montero, emptyCoverage(montero)).length
		).toBeGreaterThan(0);
	});

	it("surfaces the harmonic-minor V-VI vamp", () => {
		const found = gapProgressions(montero);
		expect(found).toContain("V-VI-V-VI");
		expect(found).toContain("V-VI-V");
	});

	it("surfaces the phrygian-dominant I-ii vamp", () => {
		const found = gapProgressions(montero);
		expect(found).toContain("I-ii-I-ii");
		expect(found).toContain("I-ii-I");
	});
});

describe("selectFinalProgressions", () => {
	it("returns a positive coverage for I'm Yours", () => {
		const result = selectFinalProgressions(imYours, coreProgressions);
		expect(result.explainedPercent).toBeGreaterThan(0);
		expect(result.coreSelected.length + result.gapSelected.length).toBeGreaterThan(
			0
		);
	});

	it("returns empty gap candidates when core progressions cover the entire song", () => {
		const fullCoverageSong = makeSong([
			["I", "V", "vi", "IV", "I", "V", "vi", "IV"]
		]);
		const result = selectFinalProgressions(fullCoverageSong, coreProgressions);
		expect(result.gapCandidates).toHaveLength(0);
		expect(result.gapSelected).toHaveLength(0);
	});
});
