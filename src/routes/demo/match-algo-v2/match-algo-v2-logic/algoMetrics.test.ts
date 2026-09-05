import { describe, expect, it } from "vitest";
import type { ParsedProgressionChord } from "../../../../chord-processing/types.js";
import type { GroupedSong, SongSection } from "../../../../data/songBrowser.js";
import { groupSongs } from "../../../../data/songBrowser.js";
import { applyHandReviewedCorrections } from "../../../../data/applyHandReviewedCorrections.js";
import songs from "../../../../../static/data/songs.json";
import coreProgressions from "$data/core-progressions.js";
import type {
	ChordAnnotation,
	ProgressionWithMatchStats
} from "../../define-chord-progression/progression-matching-logic/progressionMatchAnalysis.js";
import { computeSongAlgoMetrics } from "./algoMetrics.js";
import type { AlgoMatchResult } from "./matchResultCache.js";
import { matchSongV2 } from "./matchSongV2.js";
import { DEFAULT_WEIGHTS } from "./weights.js";

const POCKETFUL_SONG_KEY = "natasha-bedingfield__pocketful-of-sunshine";
const MIN_POCKETFUL_INTERIOR_HOLES = 1;

const chord = (
	rootPitchClass: number,
	suffix: string
): ParsedProgressionChord => ({
	rootPitchClass,
	suffix,
	display: ""
});

const C = chord(0, "major");
const D_min = chord(2, "minor");
const F = chord(5, "major");
const G = chord(7, "major");
const A_min = chord(9, "minor");

const palette = { fill: "#000", border: "#000" };

const makeSection = (
	parsedProgression: ParsedProgressionChord[],
	romanTokens: string[],
	label: string | null = "verse"
): SongSection => ({
	label,
	chords: [],
	romanTokens,
	parsedProgression,
	keyLabel: null,
	scale: "major"
});

const makeSong = (sections: SongSection[]): GroupedSong => ({
	songKey: "metrics-song",
	title: "Metrics",
	artists: ["Test"],
	keyLabel: null,
	sections
});

const annotation = (
	chordProgression: string,
	highlightPositionsBySection: number[][]
): ChordAnnotation => ({
	parsedProgression: [],
	palette,
	chordProgression,
	highlightPositionsBySection
});

const match = (
	chordProgression: string,
	isCoreProgression: boolean
): ProgressionWithMatchStats => ({
	name: chordProgression,
	chordProgression,
	parsedProgression: [],
	scale: "major",
	description: "",
	matchCount: 1,
	coveragePercent: 0,
	isCoreProgression,
	highlightPalette: palette
});

const resultFrom = (
	matches: ProgressionWithMatchStats[],
	annotations: ChordAnnotation[],
	explainedPercent = 0
): AlgoMatchResult => ({
	explainedPercent,
	matches,
	annotations,
	sectionResults: []
});

describe("computeSongAlgoMetrics", () => {
	it("splits coverage into core vs gap and flags a mid-section singleton hole", () => {
		const tokens = ["I", "vi", "IV", "V", "I", "vi", "IV", "V"];
		const section = makeSection(
			[C, A_min, chord(5, "major"), G, C, A_min, chord(5, "major"), G],
			tokens
		);
		const song = makeSong([section]);
		const metrics = computeSongAlgoMetrics(
			song,
			resultFrom(
				[match("I-vi-IV", true), match("V-I-vi", false)],
				[
					annotation("I-vi-IV", [[0, 1, 2]]),
					annotation("V-I-vi", [[4, 5, 6]])
				]
			)
		);

		expect(metrics.coveredChords).toBe(6);
		expect(metrics.coreCoveredChords).toBe(3);
		expect(metrics.gapCoveredChords).toBe(3);
		expect(metrics.sectionsStartingCovered).toBe(1);
		expect(metrics.interiorSingletonCount).toBe(1);
		expect(metrics.interiorUncoveredRunCount).toBe(1);
		expect(metrics.coveredByLength3).toBe(6);
		expect(metrics.meanUnitLength).toBe(3);
	});

	it("treats an unmatched leftover at the section end as not an interior hole", () => {
		const tokens = ["I", "ii", "V", "I", "ii", "V", "I"];
		const section = makeSection([C, D_min, G, C, D_min, G, C], tokens);
		const song = makeSong([section]);
		const metrics = computeSongAlgoMetrics(
			song,
			resultFrom(
				[match("I-ii-V", false)],
				[annotation("I-ii-V", [[0, 1, 2, 3, 4, 5]])]
			)
		);

		expect(metrics.coveredChords).toBe(6);
		expect(metrics.interiorSingletonCount).toBe(0);
		expect(metrics.interiorUncoveredRunCount).toBe(0);
		expect(metrics.sectionsStartingCovered).toBe(1);
	});

	it("counts a 3-chord leftover iv that sits between a match and the next section", () => {
		const introTokens = ["i", "VII", "VI", "iv"];
		const verseTokens = ["i", "VII", "VI", "iv", "i", "VII", "VI", "iv"];
		const intro = makeSection(
			[A_min, G, F, D_min],
			introTokens,
			"intro"
		);
		const verse = makeSection(
			[A_min, G, F, D_min, A_min, G, F, D_min],
			verseTokens,
			"verse"
		);
		const song = makeSong([intro, verse]);
		const metrics = computeSongAlgoMetrics(
			song,
			resultFrom(
				[match("i-VII-VI", true), match("i-VII-VI-iv", false)],
				[
					annotation("i-VII-VI", [[0, 1, 2], []]),
					annotation("i-VII-VI-iv", [[], [0, 1, 2, 3, 4, 5, 6, 7]])
				]
			)
		);

		expect(metrics.interiorSingletonCount).toBe(1);
		expect(metrics.coveredChords).toBe(11);
	});

	it("does not count a true prefix leftover I even when the next section starts covered", () => {
		const loopingTokens = ["I", "ii", "V", "I", "ii", "V", "I"];
		const nextTokens = ["I", "ii", "V"];
		const looping = makeSection(
			[C, D_min, G, C, D_min, G, C],
			loopingTokens,
			"verse"
		);
		const next = makeSection([C, D_min, G], nextTokens, "chorus");
		const song = makeSong([looping, next]);
		const metrics = computeSongAlgoMetrics(
			song,
			resultFrom(
				[match("I-ii-V", false)],
				[annotation("I-ii-V", [[0, 1, 2, 3, 4, 5], [0, 1, 2]])]
			)
		);

		expect(metrics.interiorSingletonCount).toBe(0);
	});

	it("counts a section-start miss and a rotated opening unit", () => {
		const tokens = ["I", "vi", "ii", "V", "I", "vi", "ii", "V"];
		const section = makeSection(
			[C, A_min, D_min, G, C, A_min, D_min, G],
			tokens
		);
		const song = makeSong([section]);
		const metrics = computeSongAlgoMetrics(
			song,
			resultFrom(
				[match("vi-ii-V-I", true)],
				[annotation("vi-ii-V-I", [[1, 2, 3, 4]])]
			)
		);

		expect(metrics.sectionsStartingCovered).toBe(0);
		expect(metrics.openingPrefixAlignedSections).toBe(0);
		expect(metrics.coveredByLength4Plus).toBe(4);
	});

	it("marks an opening unit as prefix-aligned when it matches the section tokens", () => {
		const tokens = ["I", "vi", "ii", "V", "I", "vi", "ii", "V"];
		const section = makeSection(
			[C, A_min, D_min, G, C, A_min, D_min, G],
			tokens
		);
		const song = makeSong([section]);
		const metrics = computeSongAlgoMetrics(
			song,
			resultFrom(
				[match("I-vi-ii-V", true)],
				[annotation("I-vi-ii-V", [[0, 1, 2, 3, 4, 5, 6, 7]])]
			)
		);

		expect(metrics.sectionsStartingCovered).toBe(1);
		expect(metrics.openingPrefixAlignedSections).toBe(1);
		expect(metrics.openingPrefixAlignRate).toBe(100);
	});
});

describe("computeSongAlgoMetrics — Pocketful of Sunshine", () => {
	const pocketfulSong = groupSongs(
		applyHandReviewedCorrections(
			songs as Parameters<typeof applyHandReviewedCorrections>[0]
		).filter((song) => song.songKey === POCKETFUL_SONG_KEY)
	)[0];

	it("counts the unmatched iv after i-VII-VI before the next covered section", () => {
		const result = matchSongV2(
			pocketfulSong,
			coreProgressions,
			DEFAULT_WEIGHTS
		);
		const metrics = computeSongAlgoMetrics(pocketfulSong, {
			explainedPercent: result.explainedPercent,
			matches: result.matches,
			annotations: result.annotations,
			sectionResults: result.sectionResults
		});

		expect(metrics.interiorSingletonCount).toBeGreaterThanOrEqual(
			MIN_POCKETFUL_INTERIOR_HOLES
		);
	});
});
