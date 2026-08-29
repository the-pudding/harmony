import { describe, expect, it } from "vitest";
import songs from "../../../../../static/data/songs.json";
import coreProgressions from "$data/core-progressions.js";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";
import type { ParsedProgressionChord } from "../../../../chord-processing/types.js";
import type { GroupedSong, SongSection } from "../../../../data/songBrowser.js";
import { groupSongs } from "../../../../data/songBrowser.js";
import { applyHandReviewedCorrections } from "../../../../data/applyHandReviewedCorrections.js";
import { computeGapFillProgressionMatches } from "./gapFillProgressionAnalysis.js";
import { selectFinalProgressions } from "./finalProgressionSelection.js";
import { emptyCoverage } from "./greedyProgressionSelection.js";
import {
	computeProgressionMatches,
	MIN_PROGRESSION_OCCURRENCES
} from "./progressionMatchAnalysis.js";
import {
	MIN_PROGRESSION_LENGTH,
	MAX_PROGRESSION_LENGTH
} from "./progressionConstraints.js";
import {
	SCALE_INTERVALS,
	type ScaleName
} from "../../../../chord-processing/scale-intervals.js";
import { correctedSongContentsToSongInputs } from "../../../../data/applyHandReviewedCorrections.js";
import { handCorrectedSongs } from "../../../../data/hand-corrected-songs.js";

const makeSection = (romanTokens: string[]): SongSection => ({
	label: null,
	chords: romanTokens,
	romanTokens,
	parsedProgression: romanTokensToParsedProgression(romanTokens) ?? [],
	keyLabel: null,
	scale: "major"
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
	keyLabel: null,
	scale: "major"
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

const NOTES_PER_OCTAVE = 12;
const ROMAN_BASES = ["I", "II", "III", "IV", "V", "VI", "VII"];

const makeModalSection = (
	romanTokens: string[],
	scale: ScaleName,
	tonicPitchClass = 0
): SongSection => {
	const parsedProgression = romanTokens.map((token) => {
		const degree = ROMAN_BASES.indexOf(token.toUpperCase()) + 1;
		const rootPitchClass =
			(tonicPitchClass + SCALE_INTERVALS[scale]![degree - 1]) %
			NOTES_PER_OCTAVE;
		const suffix = token === token.toUpperCase() ? "major" : "minor";
		return chord(rootPitchClass, suffix);
	});
	return {
		label: null,
		chords: romanTokens,
		romanTokens,
		parsedProgression,
		keyLabel: null,
		scale
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

describe("computeGapFillProgressionMatches — gap-only filtering with partial core coverage", () => {
	const whatchaSayStyleSection = ["IV", "I", "vi", "V", "IV", "I", "vi"];
	const partialCoreSong = makeSong([
		whatchaSayStyleSection,
		whatchaSayStyleSection
	]);
	const coreCoverage = partialCoreSong.sections.map(() => [3, 4, 5]);

	it("surfaces IV-I-vi when opening instances lie entirely in gaps", () => {
		const found = computeGapFillProgressionMatches(
			partialCoreSong,
			coreCoverage
		).map((match) => match.chordProgression);
		expect(found).toContain("IV-I-vi");
	});

	it("does not surface vi-V-IV when every instance overlaps core", () => {
		const found = computeGapFillProgressionMatches(
			partialCoreSong,
			coreCoverage
		).map((match) => match.chordProgression);
		expect(found).not.toContain("vi-V-IV");
	});

	it("reports gap-only match counts for IV-I-vi", () => {
		const match = computeGapFillProgressionMatches(
			partialCoreSong,
			coreCoverage
		).find((candidate) => candidate.chordProgression === "IV-I-vi");
		expect(match?.matchCount).toBe(2);
	});
});

describe("computeGapFillProgressionMatches — I'm Yours", () => {
	it("excludes axis-of-awesome core variants including I-V-vi", () => {
		const found = gapProgressions(imYours);
		expect(found).not.toContain("I-V-vi");
		expect(found).not.toContain("I-V-vi-IV");
	});

	it("still surfaces the progressions that already worked", () => {
		const found = gapProgressions(imYours);
		expect(found).toContain("V-vi-IV");
		expect(found).toContain("IV-I-V");
	});

	it("excludes core progressions from gap-fill candidates", () => {
		expect(gapProgressions(imYours)).not.toContain("I-V-vi-IV");
	});

	it("keeps non-core sub-progressions alongside longer non-core progressions", () => {
		const found = gapProgressions(imYours);
		expect(found).toContain("V-vi-IV");
		expect(found).toContain("I-V-vi-V-IV");
	});
});

describe("computeGapFillProgressionMatches — invariants", () => {
	it("only returns progressions of at least the minimum length", () => {
		const matches = computeGapFillProgressionMatches(
			imYours,
			emptyCoverage(imYours)
		);
		for (const match of matches) {
			expect(match.chordProgression.split("-").length).toBeGreaterThanOrEqual(
				MIN_PROGRESSION_LENGTH
			);
		}
	});

	it("only returns progressions that recur at least the minimum number of times", () => {
		const matches = computeGapFillProgressionMatches(
			imYours,
			emptyCoverage(imYours)
		);
		expect(matches.length).toBeGreaterThan(0);
		for (const match of matches) {
			expect(match.matchCount).toBeGreaterThanOrEqual(
				MIN_PROGRESSION_OCCURRENCES
			);
		}
	});

	it("never returns progressions that occur 0 times or cover 0% of the song", () => {
		const matches = computeGapFillProgressionMatches(
			imYours,
			emptyCoverage(imYours)
		);
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
		const matches = computeGapFillProgressionMatches(
			imYours,
			emptyCoverage(imYours)
		);
		for (const match of matches) {
			expect(match.isCoreProgression).toBe(false);
		}
	});
});

describe("computeGapFillProgressionMatches — recurrence detection", () => {
	const NON_CORE_RECURRING_TOKENS = ["ii", "iii", "vi"];
	const nonCoreRecurring = NON_CORE_RECURRING_TOKENS.join("-");

	it("uses a fixture progression that is genuinely not a core progression", () => {
		const song = makeSong([NON_CORE_RECURRING_TOKENS]);
		const coreNames = computeProgressionMatches(song, coreProgressions).map(
			(match) => match.chordProgression
		);
		expect(coreNames).not.toContain(nonCoreRecurring);
	});

	it("surfaces a progression that appears exactly twice", () => {
		const song = makeSong([
			[...NON_CORE_RECURRING_TOKENS, ...NON_CORE_RECURRING_TOKENS]
		]);
		expect(gapProgressions(song)).toContain(nonCoreRecurring);
	});

	it("does not surface a progression that appears only once", () => {
		const song = makeSong([["I", "IV", "V", "vi", "ii", "iii"]]);
		expect(
			computeGapFillProgressionMatches(song, emptyCoverage(song))
		).toHaveLength(0);
	});

	it("counts occurrences across separate sections", () => {
		const song = makeSong([
			NON_CORE_RECURRING_TOKENS,
			["I", ...NON_CORE_RECURRING_TOKENS]
		]);
		expect(gapProgressions(song)).toContain(nonCoreRecurring);
	});

	it("does not double-count slide-window matches that share a boundary chord", () => {
		const song = makeSong([["i", "v", "VI", "iv", "i", "v", "VI", "iv", "i"]]);
		// i-v-VI-iv appears at positions 0-3 and 4-7: 2 non-overlapping matches
		expect(gapProgressions(song)).toContain("i-v-VI-iv");
		// i-v-VI-iv-i appears at positions 0-4 and 4-8: shares boundary chord at index 4,
		// so only 1 non-overlapping match — it must be excluded by the ≥2 threshold
		expect(gapProgressions(song)).not.toContain("i-v-VI-iv-i");
	});

	it("ignores progressions shorter than the minimum length", () => {
		const song = makeSong([["I", "V", "I", "V"]]);
		expect(
			computeGapFillProgressionMatches(song, emptyCoverage(song))
		).toHaveLength(0);
	});

	it("returns nothing for a song with no repeating structure", () => {
		const song = makeSong([["I", "ii", "iii", "IV", "V", "vi"]]);
		expect(
			computeGapFillProgressionMatches(song, emptyCoverage(song))
		).toHaveLength(0);
	});

	it("surfaces long recurring progressions, not just the minimum length", () => {
		const song = makeSong([["I", "V", "vi", "IV", "I", "V", "vi", "IV"]]);
		expect(gapProgressions(song)).not.toContain("I-V-vi-IV");
		expect(gapProgressions(song)).not.toContain("I-V-vi");
		expect(gapProgressions(song)).toContain("V-vi-IV");
	});

	it("never returns progressions longer than the maximum length", () => {
		const longBlock = ["I", "ii", "iii", "IV", "V", "vi", "bVII", "I", "ii"];
		const song = makeSong([[...longBlock, ...longBlock]]);
		const progressions = gapProgressions(song);
		expect(progressions.length).toBeGreaterThan(0);
		expect(
			progressions.every(
				(progression) => progression.split("-").length <= MAX_PROGRESSION_LENGTH
			)
		).toBe(true);
	});
});

describe("computeGapFillProgressionMatches — ignores slash bass", () => {
	const invertedSupertonicSong: GroupedSong = {
		songKey: "test",
		title: "Test Song",
		artists: ["Tester"],
		keyLabel: null,
		sections: [
			makeSectionWithParsed(
				["I", "ii", "V", "I", "ii", "V"],
				[
					TONIC,
					{
						rootPitchClass: 2,
						suffix: "minor",
						bassPitchClass: 5,
						display: ""
					},
					DOMINANT,
					TONIC,
					{
						rootPitchClass: 2,
						suffix: "minor",
						bassPitchClass: 5,
						display: ""
					},
					DOMINANT
				]
			)
		]
	};

	it("surfaces progressions whose only difference is an inverted (slash) chord", () => {
		expect(gapProgressions(invertedSupertonicSong)).toContain("I-ii-V");
	});

	const mixedSupertonicSong: GroupedSong = {
		songKey: "test",
		title: "Test Song",
		artists: ["Tester"],
		keyLabel: null,
		sections: [
			makeSectionWithParsed(
				["I", "ii", "V", "I", "ii", "V"],
				[
					TONIC,
					{
						rootPitchClass: 2,
						suffix: "minor",
						bassPitchClass: 5,
						display: ""
					},
					DOMINANT,
					TONIC,
					{ rootPitchClass: 2, suffix: "minor", display: "" },
					DOMINANT
				]
			)
		]
	};

	it("treats a slash chord and its root-position form as the same chord", () => {
		expect(gapProgressions(mixedSupertonicSong)).toContain("I-ii-V");
	});
});

describe("computeGapFillProgressionMatches — no self-repeating progressions", () => {
	it("never returns a progression that is its own unit repeated consecutively", () => {
		const matches = computeGapFillProgressionMatches(
			imYours,
			emptyCoverage(imYours)
		);
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
		expect(found).toContain("V-VI-V");
		expect(found.some((progression) => progression.startsWith("V-VI-V"))).toBe(
			true
		);
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
		expect(
			result.coreSelected.length + result.gapSelected.length
		).toBeGreaterThan(0);
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

// Integration: Travis Scott "Highest in the Room"
// Outro: vi · i · v · VI · iv · i · v · VI · iv · i
// After the non-overlapping fix, the gap-fill should surface i-v-VI-iv (2×),
// not i-v-VI-iv-i (which only has 1 non-overlapping instance and must be excluded).

const highestInTheRoomReview = handCorrectedSongs.find(
	(s) => s.id === "travis-scott__highest-in-the-room"
)!;
const highestInTheRoomSong = groupSongs(
	correctedSongContentsToSongInputs(
		highestInTheRoomReview.id,
		"Highest in the Room",
		["Travis Scott"],
		2019,
		highestInTheRoomReview.correctedSongContents
	)
)[0];

describe("selectFinalProgressions — highest in the room outro regression", () => {
	it("core progressions do not match the outro's i-v-VI-iv vamp", () => {
		const result = selectFinalProgressions(
			highestInTheRoomSong,
			coreProgressions
		);
		// The song does legitimately match other core progressions elsewhere
		// (e.g. "i v vamp"), so this only checks that the specific outro
		// pattern isn't swallowed by a core progression before gap-fill can
		// claim it.
		expect(
			result.coreSelected.some((m) => m.chordProgression === "i-v-VI-iv")
		).toBe(false);
	});

	it("surfaces i-v-VI-iv in gap candidates with 2 occurrences", () => {
		const result = selectFinalProgressions(
			highestInTheRoomSong,
			coreProgressions
		);
		const match = result.gapCandidates.find(
			(m) => m.chordProgression === "i-v-VI-iv"
		);
		expect(match).toBeDefined();
		expect(match!.matchCount).toBe(2);
	});

	it("selects i-v-VI-iv in the gap-fill selection", () => {
		const result = selectFinalProgressions(
			highestInTheRoomSong,
			coreProgressions
		);
		const gapKeys = result.gapSelected.map((m) => m.chordProgression);
		expect(gapKeys).toContain("i-v-VI-iv");
	});

	it("does not include i-v-VI-iv-i in gap candidates (only 1 non-overlapping instance)", () => {
		const result = selectFinalProgressions(
			highestInTheRoomSong,
			coreProgressions
		);
		const candidate = result.gapCandidates.find(
			(m) => m.chordProgression === "i-v-VI-iv-i"
		);
		expect(candidate).toBeUndefined();
	});
});

// God's Plan-style vamp regression:
// When a section is a pure vamp (e.g. iv-v repeated 8× = 16 chords), a longer
// version of the pattern (iv-v-iv-v-iv-v, 6 chords) used to win the greedy sort
// over the shorter one (iv-v-iv-v, 4 chords) because overlapping raw matches made
// both look like they covered all 16 positions. With the tiebreaker favouring
// length, the 6-chord form was selected, leaving the last 4 chords unhighlighted
// while still reporting 100% coverage. The fix (non-overlapping in
// computeCoveredPositionsBySection) makes the 4-chord form win with more real
// coverage (28 positions vs 24).

const vampVerse = makeSection([
	"iv",
	"v",
	"iv",
	"v",
	"iv",
	"v",
	"iv",
	"v",
	"iv",
	"v",
	"iv",
	"v",
	"iv",
	"v",
	"iv",
	"v"
]);
const vampBridge = makeSection([
	"iv",
	"v",
	"iv",
	"v",
	"iv",
	"v",
	"iv",
	"v",
	"iv",
	"v",
	"iv",
	"v"
]);
const vampPreChorus = makeSection(["iv", "v", "VI", "i", "iv", "v", "VI", "i"]);

const vampSong: GroupedSong = {
	songKey: "drake__gods-plan",
	title: "God's Plan",
	artists: ["Drake"],
	keyLabel: null,
	sections: [vampVerse, vampBridge, vampPreChorus]
};

describe("selectFinalProgressions — vamp regression (gods plan)", () => {
	it("selects iv-v-iv-v (4-chord) as a gap-fill, not iv-v-iv-v-iv-v (6-chord)", () => {
		const result = selectFinalProgressions(vampSong, coreProgressions);
		const gapKeys = result.gapSelected.map((m) => m.chordProgression);
		expect(gapKeys).toContain("iv-v-iv-v");
		expect(gapKeys).not.toContain("iv-v-iv-v-iv-v");
	});

	it("iv-v-iv-v has more non-overlapping coverage than iv-v-iv-v-iv-v in the vamp sections", () => {
		const result = selectFinalProgressions(vampSong, coreProgressions);
		const short = result.gapCandidates.find(
			(m) => m.chordProgression === "iv-v-iv-v"
		);
		const long = result.gapCandidates.find(
			(m) => m.chordProgression === "iv-v-iv-v-iv-v"
		);
		expect(short).toBeDefined();
		expect(short!.matchCount).toBeGreaterThan(long?.matchCount ?? 0);
	});

	it("also selects iv-v-VI-i for the pre-chorus section", () => {
		const result = selectFinalProgressions(vampSong, coreProgressions);
		const gapKeys = result.gapSelected.map((m) => m.chordProgression);
		expect(gapKeys).toContain("iv-v-VI-i");
	});

	it("reaches 100% explained coverage with iv-v-iv-v and iv-v-VI-i together", () => {
		const result = selectFinalProgressions(vampSong, coreProgressions);
		expect(result.explainedPercent).toBe(100);
	});
});

describe("computeGapFillProgressionMatches — land of confusion modal scales", () => {
	const landOfConfusion = groupSongs(
		applyHandReviewedCorrections(
			songs as Parameters<typeof applyHandReviewedCorrections>[0]
		)
	).find((song) => song.songKey === "genesis__land-of-confusion");

	it("does not surface duplicate roman strings across minor and dorian sections", () => {
		expect(landOfConfusion).toBeDefined();
		const gapCandidates = computeGapFillProgressionMatches(
			landOfConfusion!,
			emptyCoverage(landOfConfusion!)
		);
		const chordProgressions = gapCandidates.map(
			(candidate) => candidate.chordProgression
		);
		expect(new Set(chordProgressions).size).toBe(chordProgressions.length);
		expect(
			gapCandidates.filter(
				(candidate) => candidate.chordProgression === "VII-i-III"
			)
		).toHaveLength(1);
	});
});
