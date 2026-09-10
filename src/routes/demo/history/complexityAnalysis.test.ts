import { describe, expect, it } from "vitest";
import type { GroupedSong, SongSection } from "../../../data/songBrowser.js";
import type {
	SongCoverageEntry,
	SongProgressionCount
} from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
import {
	computeChordComplexityHistory,
	computeProgressionCountHistory
} from "./complexityAnalysis.js";

const makeSection = (
	romanTokens: string[],
	scale: SongSection["scale"] = "major"
): SongSection => ({
	label: null,
	chords: [],
	romanTokens,
	parsedProgression: [],
	keyLabel: null,
	scale
});

const makeSong = (
	songKey: string,
	year: number,
	sections: SongSection[]
): GroupedSong => ({
	songKey,
	title: songKey,
	artists: ["Someone"],
	year,
	keyLabel: "C major",
	sections
});

describe("computeChordComplexityHistory", () => {
	it("averages distinct chord count per song within a decade", () => {
		const songs = [
			...Array.from({ length: 15 }, (_, i) =>
				makeSong(`a-${i}`, 1975, [makeSection(["I", "IV", "V", "I"])])
			), // 3 distinct chords each
			...Array.from({ length: 10 }, (_, i) =>
				makeSong(`b-${i}`, 1975, [makeSection(["I", "ii", "IV", "V", "vi", "I"])])
			) // 5 distinct chords each
		];

		const history = computeChordComplexityHistory(songs);
		const seventies = history.find((row) => row.decade === 1970);
		expect(seventies).toBeDefined();
		expect(seventies!.songCount).toBe(25);
		expect(seventies!.avgDistinctChords).toBeCloseTo((15 * 3 + 10 * 5) / 25);
	});

	it("treats extensions as the same chord for distinct-chord counting", () => {
		const songs = Array.from({ length: 20 }, (_, i) =>
			makeSong(`s-${i}`, 1985, [makeSection(["I", "V7", "V", "I"])])
		);
		const history = computeChordComplexityHistory(songs);
		const eighties = history.find((row) => row.decade === 1980);
		expect(eighties!.avgDistinctChords).toBeCloseTo(2); // I and V, V7 collapses into V
	});

	it("computes the non-diatonic token rate and share of songs with a non-diatonic chord", () => {
		const songs = [
			...Array.from({ length: 20 }, (_, i) =>
				makeSong(`clean-${i}`, 1995, [makeSection(["I", "IV", "V", "I"])])
			),
			...Array.from({ length: 5 }, (_, i) =>
				// "iv" is non-diatonic in a major-key section (borrowed minor iv).
				makeSong(`borrowed-${i}`, 1995, [makeSection(["I", "iv", "I"])])
			)
		];

		const history = computeChordComplexityHistory(songs);
		const nineties = history.find((row) => row.decade === 1990);
		expect(nineties).toBeDefined();
		expect(nineties!.songsWithNonDiatonicPercent).toBeCloseTo((5 / 25) * 100);
		expect(nineties!.nonDiatonicTokenPercent).toBeGreaterThan(0);
	});

	it("skips decades below the minimum song-count threshold", () => {
		const songs = [makeSong("only-one", 1965, [makeSection(["I", "V", "I"])])];
		const history = computeChordComplexityHistory(songs);
		expect(history.find((row) => row.decade === 1960)).toBeUndefined();
	});

	it("skips songs with no year", () => {
		const songs = Array.from({ length: 25 }, (_, i) => ({
			...makeSong(`s-${i}`, 1985, [makeSection(["I", "V", "I"])]),
			year: undefined
		}));
		expect(computeChordComplexityHistory(songs)).toHaveLength(0);
	});
});

const makeProgressionCount = (chordProgression: string): SongProgressionCount => ({
	chordProgression,
	name: chordProgression,
	scale: "major",
	matchCount: 1,
	chorusMatchCount: 0,
	coveragePercent: 0,
	isCore: false
});

const makeCoverageEntry = (
	songKey: string,
	progressionCount: number
): SongCoverageEntry => ({
	songKey,
	title: songKey,
	artists: ["Someone"],
	coveragePercent: 0,
	matchingProgressions: [],
	progressionCounts: Array.from({ length: progressionCount }, (_, i) =>
		makeProgressionCount(`progression-${i}`)
	),
	biasOverrides: []
});

describe("computeProgressionCountHistory", () => {
	it("averages distinct progression count per song within a decade", () => {
		const songByKey = new Map<string, GroupedSong>();
		const entries: SongCoverageEntry[] = [];
		for (let i = 0; i < 15; i++) {
			const songKey = `two-${i}`;
			songByKey.set(songKey, makeSong(songKey, 2005, []));
			entries.push(makeCoverageEntry(songKey, 2));
		}
		for (let i = 0; i < 10; i++) {
			const songKey = `four-${i}`;
			songByKey.set(songKey, makeSong(songKey, 2005, []));
			entries.push(makeCoverageEntry(songKey, 4));
		}

		const history = computeProgressionCountHistory(entries, songByKey);
		const twoThousands = history.find((row) => row.decade === 2000);
		expect(twoThousands).toBeDefined();
		expect(twoThousands!.songCount).toBe(25);
		expect(twoThousands!.avgDistinctProgressions).toBeCloseTo((15 * 2 + 10 * 4) / 25);
	});

	it("skips decades below the minimum song-count threshold", () => {
		const songByKey = new Map<string, GroupedSong>([
			["only-one", makeSong("only-one", 1965, [])]
		]);
		const history = computeProgressionCountHistory(
			[makeCoverageEntry("only-one", 3)],
			songByKey
		);
		expect(history.find((row) => row.decade === 1960)).toBeUndefined();
	});

	it("skips entries missing a year or missing from songByKey", () => {
		const songByKey = new Map<string, GroupedSong>([
			["with-year", makeSong("with-year", 1985, [])],
			["no-year", { ...makeSong("no-year", 1985, []), year: undefined }]
		]);
		const entries = [
			makeCoverageEntry("with-year", 3),
			makeCoverageEntry("no-year", 3),
			makeCoverageEntry("unknown-song", 3)
		];
		expect(computeProgressionCountHistory(entries, songByKey)).toHaveLength(0);
	});
});
