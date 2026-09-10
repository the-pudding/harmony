import { describe, expect, it } from "vitest";
import type { ScaleName } from "../../../chord-processing/scales.js";
import type { GroupedSong } from "../../../data/songBrowser.js";
import type { SongCoverageEntry, SongProgressionCount } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
import { computeDecadeHistory, decadeOf } from "./decadeSignatures.js";

const AXIS = "I-V-vi-IV";
const DOO_WOP = "I-vi-IV-V";

const makeCount = (
	chordProgression: string,
	matchCount: number,
	isCore = true,
	name: string = chordProgression
): SongProgressionCount => ({
	chordProgression,
	name,
	scale: "major" as ScaleName,
	matchCount,
	chorusMatchCount: matchCount,
	coveragePercent: 50,
	isCore
});

const makeSong = (
	songKey: string,
	year: number,
	counts: SongProgressionCount[]
): { song: GroupedSong; entry: SongCoverageEntry } => ({
	song: {
		songKey,
		title: songKey,
		artists: ["Someone"],
		year,
		keyLabel: "C major",
		sections: []
	},
	entry: {
		songKey,
		title: songKey,
		artists: ["Someone"],
		coveragePercent: 50,
		matchingProgressions: counts.filter((c) => c.isCore).map((c) => c.chordProgression),
		progressionCounts: counts,
		biasOverrides: []
	}
});

describe("decadeOf", () => {
	it("floors fractional years down to the decade", () => {
		expect(decadeOf(1997.2)).toBe(1990);
		expect(decadeOf(2020.9999)).toBe(2020);
		expect(decadeOf(2000)).toBe(2000);
	});
});

describe("computeDecadeHistory", () => {
	it("ranks a rare-elsewhere, common-here progression as more distinctive than a globally common one", () => {
		const pairs = [
			// 1970s: AXIS is common here and everywhere (not distinctive);
			// DOO_WOP is rare everywhere except concentrated in the 1970s.
			...Array.from({ length: 20 }, (_, i) =>
				makeSong(`s70-axis-${i}`, 1975, [makeCount(AXIS, 5)])
			),
			...Array.from({ length: 20 }, (_, i) =>
				makeSong(`s70-doowop-${i}`, 1975, [makeCount(DOO_WOP, 5)])
			),
			// Other decades: only AXIS shows up, never DOO_WOP.
			...Array.from({ length: 20 }, (_, i) =>
				makeSong(`s80-axis-${i}`, 1985, [makeCount(AXIS, 5)])
			),
			...Array.from({ length: 20 }, (_, i) =>
				makeSong(`s90-axis-${i}`, 1995, [makeCount(AXIS, 5)])
			)
		];

		const songByKey = new Map(pairs.map(({ song }) => [song.songKey, song]));
		const entries = pairs.map(({ entry }) => entry);

		const history = computeDecadeHistory(entries, songByKey);
		const seventies = history.find((d) => d.decade === 1970);
		expect(seventies).toBeDefined();
		expect(seventies!.signatures[0].chordProgression).toBe(DOO_WOP);
		expect(seventies!.signatures[0].distinctiveness).toBeGreaterThan(1);
	});

	it("excludes progressions below the minimum sample-size threshold", () => {
		const pairs = [
			...Array.from({ length: 20 }, (_, i) =>
				makeSong(`s-${i}`, 1975, [makeCount(AXIS, 5)])
			),
			makeSong("rare", 1975, [makeCount(DOO_WOP, 2)]) // below MIN_PROGRESSION_DECADE_COUNT
		];
		const songByKey = new Map(pairs.map(({ song }) => [song.songKey, song]));
		const entries = pairs.map(({ entry }) => entry);

		const history = computeDecadeHistory(entries, songByKey);
		const seventies = history.find((d) => d.decade === 1970);
		expect(seventies!.signatures.map((s) => s.chordProgression)).not.toContain(
			DOO_WOP
		);
	});

	it("ignores non-core progression counts entirely", () => {
		const pairs = Array.from({ length: 20 }, (_, i) =>
			makeSong(`s-${i}`, 1975, [makeCount(AXIS, 5, false)])
		);
		const songByKey = new Map(pairs.map(({ song }) => [song.songKey, song]));
		const entries = pairs.map(({ entry }) => entry);

		const history = computeDecadeHistory(entries, songByKey);
		expect(history).toHaveLength(0);
	});

	it("merges an un-authored rotated spelling into the same decade total as its named progression", () => {
		// Matching is tonic-rotation-invariant, so a song can match a named
		// core progression under a literal spelling that was never authored
		// (e.g. Sweet Home Alabama reads as "V-IV-I" in its own key, the
		// same shape as "sweet home mixolydian"'s authored "I-bVII-IV").
		// Both spellings must count toward the same decade signature.
		const NAME = "sweet home mixolydian";
		const pairs = [
			...Array.from({ length: 15 }, (_, i) =>
				makeSong(`s70-authored-${i}`, 1975, [
					makeCount("I-bVII-IV", 5, true, NAME)
				])
			),
			...Array.from({ length: 15 }, (_, i) =>
				makeSong(`s70-rotated-${i}`, 1975, [makeCount("V-IV-I", 5, true, NAME)])
			)
		];
		const songByKey = new Map(pairs.map(({ song }) => [song.songKey, song]));
		const entries = pairs.map(({ entry }) => entry);

		const history = computeDecadeHistory(entries, songByKey);
		const seventies = history.find((d) => d.decade === 1970);
		const signature = seventies!.signatures.find((s) => s.name === NAME);
		expect(signature).toBeDefined();
		expect(signature!.count).toBe(150); // 30 songs * matchCount 5
	});

	it("skips songs with no year", () => {
		const { song, entry } = makeSong("no-year", 1975, [makeCount(AXIS, 5)]);
		const songWithoutYear: GroupedSong = { ...song, year: undefined };
		const songByKey = new Map([[songWithoutYear.songKey, songWithoutYear]]);

		const history = computeDecadeHistory([entry], songByKey);
		expect(history).toHaveLength(0);
	});
});
