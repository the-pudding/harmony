import { describe, expect, it } from "vitest";
import type { GroupedSong, SongSection } from "../../../data/songBrowser.js";
import type {
	SongCoverageEntry,
	SongProgressionCount
} from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
import {
	computeBluesEraHistory,
	computeNamedProgressionEraHistory
} from "./eraAnalysis.js";

const makeSection = (romanTokens: string[]): SongSection => ({
	label: null,
	chords: [],
	romanTokens,
	parsedProgression: [],
	keyLabel: null,
	scale: "major"
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

describe("computeBluesEraHistory", () => {
	it("counts a song as pure blues only if every chord is major I, IV, or V", () => {
		const songs = [
			...Array.from({ length: 10 }, (_, i) =>
				makeSong(`blues-${i}`, 1955, [makeSection(["I", "IV", "I", "V", "IV", "I"])])
			),
			...Array.from({ length: 10 }, (_, i) =>
				makeSong(`not-blues-${i}`, 1955, [makeSection(["I", "IV", "vi", "V"])])
			)
		];

		const history = computeBluesEraHistory(songs);
		const fifties = history.find((row) => row.decade === 1950);
		expect(fifties).toBeDefined();
		expect(fifties!.songCount).toBe(20);
		expect(fifties!.matchedPercent).toBeCloseTo(50);
	});

	it("disqualifies a song with any accidental even if degrees are I/IV/V", () => {
		const songs = [
			...Array.from({ length: 14 }, (_, i) =>
				makeSong(`clean-${i}`, 1965, [makeSection(["I", "IV", "V"])])
			),
			makeSong("altered", 1965, [makeSection(["I", "bV", "I"])])
		];
		const history = computeBluesEraHistory(songs);
		const sixties = history.find((row) => row.decade === 1960);
		expect(sixties!.matchedPercent).toBeCloseTo((14 / 15) * 100);
	});

	it("skips decades below the minimum song-count threshold", () => {
		const songs = [makeSong("only-one", 1975, [makeSection(["I", "IV", "V"])])];
		expect(
			computeBluesEraHistory(songs).find((row) => row.decade === 1970)
		).toBeUndefined();
	});

	it("skips songs with no year", () => {
		const songs = Array.from({ length: 20 }, (_, i) => ({
			...makeSong(`s-${i}`, 1955, [makeSection(["I", "IV", "V"])]),
			year: undefined
		}));
		expect(computeBluesEraHistory(songs)).toHaveLength(0);
	});
});

const makeProgressionCount = (name: string): SongProgressionCount => ({
	chordProgression: name,
	name,
	scale: "major",
	matchCount: 1,
	chorusMatchCount: 0,
	coveragePercent: 0,
	isCore: true
});

const makeCoverageEntry = (
	songKey: string,
	names: string[]
): SongCoverageEntry => ({
	songKey,
	title: songKey,
	artists: ["Someone"],
	coveragePercent: 0,
	matchingProgressions: names,
	progressionCounts: names.map(makeProgressionCount),
	biasOverrides: []
});

describe("computeNamedProgressionEraHistory", () => {
	it("computes the % of songs matching any name in the given set", () => {
		const songByKey = new Map<string, GroupedSong>();
		const entries: SongCoverageEntry[] = [];
		for (let i = 0; i < 12; i++) {
			const songKey = `match-${i}`;
			songByKey.set(songKey, makeSong(songKey, 1955, []));
			entries.push(makeCoverageEntry(songKey, ["doo wop"]));
		}
		for (let i = 0; i < 8; i++) {
			const songKey = `nomatch-${i}`;
			songByKey.set(songKey, makeSong(songKey, 1955, []));
			entries.push(makeCoverageEntry(songKey, ["some other progression"]));
		}

		const history = computeNamedProgressionEraHistory(
			entries,
			songByKey,
			new Set(["doo wop"])
		);
		const fifties = history.find((row) => row.decade === 1950);
		expect(fifties).toBeDefined();
		expect(fifties!.songCount).toBe(20);
		expect(fifties!.matchedPercent).toBeCloseTo(60);
	});

	it("treats a family of names as a single match (any member counts)", () => {
		const songByKey = new Map<string, GroupedSong>();
		const entries: SongCoverageEntry[] = [];
		for (let i = 0; i < 5; i++) {
			const songKey = `axis-${i}`;
			songByKey.set(songKey, makeSong(songKey, 2005, []));
			entries.push(makeCoverageEntry(songKey, ["axis of awesome"]));
		}
		for (let i = 0; i < 5; i++) {
			const songKey = `mini-${i}`;
			songByKey.set(songKey, makeSong(songKey, 2005, []));
			entries.push(makeCoverageEntry(songKey, ["(mini)axis of awesome"]));
		}
		for (let i = 0; i < 10; i++) {
			const songKey = `other-${i}`;
			songByKey.set(songKey, makeSong(songKey, 2005, []));
			entries.push(makeCoverageEntry(songKey, []));
		}

		const history = computeNamedProgressionEraHistory(
			entries,
			songByKey,
			new Set(["axis of awesome", "(mini)axis of awesome", "never getting back together"])
		);
		const twoThousands = history.find((row) => row.decade === 2000);
		expect(twoThousands!.matchedPercent).toBeCloseTo(50);
	});

	it("skips decades below the minimum song-count threshold", () => {
		const songByKey = new Map<string, GroupedSong>([
			["only-one", makeSong("only-one", 1975, [])]
		]);
		const history = computeNamedProgressionEraHistory(
			[makeCoverageEntry("only-one", ["doo wop"])],
			songByKey,
			new Set(["doo wop"])
		);
		expect(history.find((row) => row.decade === 1970)).toBeUndefined();
	});

	it("skips entries missing a year or missing from songByKey", () => {
		const songByKey = new Map<string, GroupedSong>([
			["with-year", makeSong("with-year", 1985, [])],
			["no-year", { ...makeSong("no-year", 1985, []), year: undefined }]
		]);
		const entries = [
			makeCoverageEntry("with-year", ["doo wop"]),
			makeCoverageEntry("no-year", ["doo wop"]),
			makeCoverageEntry("unknown-song", ["doo wop"])
		];
		expect(
			computeNamedProgressionEraHistory(entries, songByKey, new Set(["doo wop"]))
		).toHaveLength(0);
	});
});
