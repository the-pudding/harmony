import { describe, expect, it } from "vitest";
import type { GroupedSong, SongSection } from "../../../data/songBrowser.js";
import type {
	SongCoverageEntry,
	SongProgressionCount
} from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
import {
	classifyCadence,
	computeCadenceHistory,
	computeProgressionCadenceHistory
} from "./cadenceAnalysis.js";

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
	sections: string[][]
): GroupedSong => ({
	songKey,
	title: songKey,
	artists: ["Someone"],
	year,
	keyLabel: "C major",
	sections: sections.map(makeSection)
});

describe("classifyCadence", () => {
	it("recognizes a perfect (V-I) cadence", () => {
		expect(classifyCadence(["I", "IV", "V", "I"])).toBe("perfect");
	});

	it("recognizes a plagal (IV-I) cadence", () => {
		expect(classifyCadence(["I", "V", "IV", "I"])).toBe("plagal");
	});

	it("recognizes minor-key perfect and plagal cadences", () => {
		expect(classifyCadence(["i", "iv", "v", "i"])).toBe("perfect");
		expect(classifyCadence(["i", "v", "iv", "i"])).toBe("plagal");
	});

	it("does not count a borrowed/altered tonic as resolving", () => {
		expect(classifyCadence(["I", "V", "bI"])).toBe("non-resolving");
	});

	it("does not count an altered V or IV as a perfect/plagal cadence", () => {
		expect(classifyCadence(["I", "bV", "I"])).toBe("other-resolving");
		expect(classifyCadence(["I", "bIV", "I"])).toBe("other-resolving");
	});

	it("classifies a resolving section that isn't V-I or IV-I as other-resolving", () => {
		expect(classifyCadence(["I", "vi", "ii", "I"])).toBe("other-resolving");
	});

	it("classifies a section not ending on the tonic as non-resolving", () => {
		expect(classifyCadence(["I", "IV", "V"])).toBe("non-resolving");
	});

	it("returns null for sections shorter than two chords", () => {
		expect(classifyCadence(["I"])).toBeNull();
		expect(classifyCadence([])).toBeNull();
	});
});

describe("computeCadenceHistory", () => {
	it("buckets sections by decade and computes percentages of all sections", () => {
		const songs = [
			makeSong("a", 1975, [
				["I", "V", "I"], // perfect
				["I", "IV", "I"], // plagal
				["I", "IV", "V"] // non-resolving
			]),
			...Array.from({ length: 10 }, (_, i) =>
				makeSong(`filler-${i}`, 1975, [["I", "V", "I"]])
			)
		];

		const history = computeCadenceHistory(songs);
		// 13 sections total isn't quite enough to clear the min threshold on
		// its own, so pad with enough additional perfect-cadence sections.
		const padded = [
			...songs,
			...Array.from({ length: 10 }, (_, i) =>
				makeSong(`pad-${i}`, 1975, [["I", "V", "I"]])
			)
		];
		const paddedHistory = computeCadenceHistory(padded);
		const seventies = paddedHistory.find((row) => row.decade === 1970);
		expect(seventies).toBeDefined();
		expect(seventies!.sectionCount).toBe(23);
		expect(seventies!.perfectPercent).toBeCloseTo((21 / 23) * 100);
		expect(seventies!.plagalPercent).toBeCloseTo((1 / 23) * 100);
		expect(seventies!.nonResolvingPercent).toBeCloseTo((1 / 23) * 100);
		void history;
	});

	it("computes shares among only resolving sections separately from all-section percentages", () => {
		const songs = Array.from({ length: 25 }, (_, i) =>
			makeSong(`s-${i}`, 1985, [i < 20 ? ["I", "V", "I"] : ["I", "IV", "V"]])
		);
		const history = computeCadenceHistory(songs);
		const eighties = history.find((row) => row.decade === 1980);
		expect(eighties).toBeDefined();
		expect(eighties!.perfectPercent).toBeCloseTo(80);
		expect(eighties!.perfectShareOfResolving).toBeCloseTo(100);
	});

	it("skips decades below the minimum section-count threshold", () => {
		const songs = [makeSong("only-one", 1965, [["I", "V", "I"]])];
		const history = computeCadenceHistory(songs);
		expect(history.find((row) => row.decade === 1960)).toBeUndefined();
	});

	it("skips songs with no year", () => {
		const songs = Array.from({ length: 25 }, (_, i) => ({
			...makeSong(`s-${i}`, 1985, [["I", "V", "I"]]),
			year: undefined
		}));
		const history = computeCadenceHistory(songs);
		expect(history).toHaveLength(0);
	});
});

const makeProgressionCount = (
	chordProgression: string,
	matchCount: number,
	isCore: boolean
): SongProgressionCount => ({
	chordProgression,
	name: chordProgression,
	scale: "major",
	matchCount,
	chorusMatchCount: 0,
	coveragePercent: 0,
	isCore
});

const makeCoverageEntry = (
	songKey: string,
	progressions: SongProgressionCount[]
): SongCoverageEntry => ({
	songKey,
	title: songKey,
	artists: ["Someone"],
	coveragePercent: 0,
	matchingProgressions: progressions.filter((p) => p.isCore).map((p) => p.name),
	progressionCounts: progressions,
	biasOverrides: []
});

describe("computeProgressionCadenceHistory", () => {
	it("counts each distinct progression once per song, regardless of matchCount", () => {
		const songByKey = new Map<string, GroupedSong>();
		const entries: SongCoverageEntry[] = [];
		for (let i = 0; i < 25; i++) {
			const songKey = `s-${i}`;
			songByKey.set(songKey, makeSong(songKey, 1985, []));
			entries.push(
				makeCoverageEntry(songKey, [
					// A huge matchCount (heavily looped) must still count as 1.
					makeProgressionCount("IV-V-I", 50, true)
				])
			);
		}

		const history = computeProgressionCadenceHistory(entries, songByKey);
		const eighties = history.find((row) => row.decade === 1980);
		expect(eighties).toBeDefined();
		expect(eighties!.progressionInstanceCount).toBe(25);
		expect(eighties!.perfectPercent).toBeCloseTo(100);
	});

	it("includes gap-fill (non-core) progressions, not just named core ones", () => {
		const songByKey = new Map<string, GroupedSong>();
		const entries: SongCoverageEntry[] = [];
		for (let i = 0; i < 25; i++) {
			const songKey = `s-${i}`;
			songByKey.set(songKey, makeSong(songKey, 1995, []));
			entries.push(
				makeCoverageEntry(songKey, [makeProgressionCount("V-IV-I", 3, false)])
			);
		}

		const history = computeProgressionCadenceHistory(entries, songByKey);
		const nineties = history.find((row) => row.decade === 1990);
		expect(nineties).toBeDefined();
		expect(nineties!.progressionInstanceCount).toBe(25);
		expect(nineties!.plagalPercent).toBeCloseTo(100);
	});

	it("classifies by the literal matched spelling, not a canonical/registered one", () => {
		// Same conceptual progression, two different literal rotations — each
		// should be classified independently by its own actual ending.
		const songByKey = new Map<string, GroupedSong>([
			["rotated", makeSong("rotated", 2005, [])],
			["unresolved", makeSong("unresolved", 2005, [])]
		]);
		const entries: SongCoverageEntry[] = [
			...Array.from({ length: 15 }, (_, i) =>
				makeCoverageEntry(`rotated-${i}`, [
					makeProgressionCount("V-IV-I", 1, true) // ends in plagal cadence
				])
			),
			...Array.from({ length: 10 }, (_, i) =>
				makeCoverageEntry(`unresolved-${i}`, [
					makeProgressionCount("I-bVII-IV", 1, true) // registered spelling, doesn't resolve
				])
			)
		];
		for (const entry of entries) {
			songByKey.set(entry.songKey, makeSong(entry.songKey, 2005, []));
		}

		const history = computeProgressionCadenceHistory(entries, songByKey);
		const twoThousands = history.find((row) => row.decade === 2000);
		expect(twoThousands).toBeDefined();
		expect(twoThousands!.plagalPercent).toBeCloseTo(60); // 15/25
		expect(twoThousands!.nonResolvingPercent).toBeCloseTo(40); // 10/25
	});

	it("skips songs missing a year or missing from songByKey", () => {
		const songByKey = new Map<string, GroupedSong>([
			["with-year", makeSong("with-year", 1985, [])],
			["no-year", { ...makeSong("no-year", 1985, []), year: undefined }]
		]);
		const entries: SongCoverageEntry[] = [
			makeCoverageEntry("with-year", [makeProgressionCount("IV-V-I", 1, true)]),
			makeCoverageEntry("no-year", [makeProgressionCount("IV-V-I", 1, true)]),
			makeCoverageEntry("unknown-song", [makeProgressionCount("IV-V-I", 1, true)])
		];

		const history = computeProgressionCadenceHistory(entries, songByKey);
		// Only 1 valid instance — well under the minimum threshold.
		expect(history).toHaveLength(0);
	});
});
