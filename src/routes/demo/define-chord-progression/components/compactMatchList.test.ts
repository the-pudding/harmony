import { describe, expect, it } from "vitest";
import type { GroupedSong, SongSection } from "../../../../data/songBrowser.js";
import type {
	ChordAnnotation,
	ProgressionWithMatchStats
} from "../progression-matching-logic/progressionMatchAnalysis.js";
import {
	buildCompactMatchList,
	COMPACT_MATCH_LIST_OVERFLOW_VISIBLE_COUNT,
	COMPACT_MATCH_LIST_SLOT_COUNT,
	hiddenMatchesCoveragePercent,
	MAX_COVERAGE_PERCENT
} from "./compactMatchList.js";

const palette = { fill: "#000", border: "#000" };

const makeSection = (chordCount: number): SongSection => ({
	label: "verse",
	chords: [],
	romanTokens: [],
	parsedProgression: Array.from({ length: chordCount }, () => ({
		rootPitchClass: 0,
		suffix: "major",
		display: ""
	})),
	keyLabel: null,
	scale: "major"
});

const makeSong = (chordCount: number): GroupedSong => ({
	songKey: "compact-list-song",
	title: "Compact",
	artists: ["Test"],
	keyLabel: null,
	sections: [makeSection(chordCount)]
});

const makeMatch = (
	chordProgression: string,
	coveragePercent: number
): ProgressionWithMatchStats => ({
	name: chordProgression,
	chordProgression,
	parsedProgression: [],
	scale: "major",
	description: "",
	matchCount: 1,
	coveragePercent,
	isCoreProgression: true,
	highlightPalette: palette
});

const makeAnnotation = (
	chordProgression: string,
	positions: number[]
): ChordAnnotation => ({
	parsedProgression: [],
	palette,
	chordProgression,
	highlightPositionsBySection: [positions]
});

describe("hiddenMatchesCoveragePercent", () => {
	it("uses unique claimed chord positions when annotations overlap", () => {
		const song = makeSong(10);
		const hidden = [makeMatch("I-V-vi-IV", 40), makeMatch("I-vi-IV-V", 40)];
		const annotations = [
			makeAnnotation("I-V-vi-IV", [0, 1, 2, 3]),
			makeAnnotation("I-vi-IV-V", [2, 3, 4, 5])
		];

		expect(hiddenMatchesCoveragePercent(hidden, song, annotations)).toBe(60);
	});

	it("sums and caps per-progression percents when annotations have no positions", () => {
		const song = makeSong(10);
		const hidden = [makeMatch("I-V-vi-IV", 70), makeMatch("I-vi-IV-V", 50)];

		expect(hiddenMatchesCoveragePercent(hidden, song, [])).toBe(
			MAX_COVERAGE_PERCENT
		);
	});
});

describe("buildCompactMatchList", () => {
	it("shows every match when there are at most nine", () => {
		const matches = Array.from({ length: COMPACT_MATCH_LIST_SLOT_COUNT }, (_, i) =>
			makeMatch(`p-${i}`, 10)
		);
		const list = buildCompactMatchList(matches, makeSong(10), []);

		expect(list.visibleMatches).toHaveLength(COMPACT_MATCH_LIST_SLOT_COUNT);
		expect(list.overflow).toBeNull();
	});

	it("reserves the last slot for hidden coverage when there are more than nine", () => {
		const matches = Array.from(
			{ length: COMPACT_MATCH_LIST_SLOT_COUNT + 3 },
			(_, i) => makeMatch(`p-${i}`, 5)
		);
		const annotations = matches.map((match, i) =>
			makeAnnotation(match.chordProgression, [i])
		);
		const list = buildCompactMatchList(matches, makeSong(20), annotations);

		expect(list.visibleMatches).toHaveLength(
			COMPACT_MATCH_LIST_OVERFLOW_VISIBLE_COUNT
		);
		expect(list.overflow).toEqual({
			hiddenCount: 4,
			coveragePercent: 20
		});
	});
});
