import { describe, expect, it } from "vitest";
import type { SongCoverageEntry } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
import {
	buildProgressionGroupShares,
	songKeysMatchingGroupFilter
} from "./progressionGroupShare.js";

const MINOR_AXIS_NAME = "(minor)axis of awesome";
const AXIS_NAME = "axis of awesome";
const AXIS_GROUP = "Axis of awesome";
const HAPPY_GROUP = "Happy, major-y progressions";
const MINOR_AXIS_SPELLING = "vi-IV-I-V";
const AXIS_SPELLING = "I-V-vi-IV";

const song = (
	songKey: string,
	matches: { name: string; chordProgression: string }[]
): SongCoverageEntry => ({
	songKey,
	title: songKey,
	artists: [],
	coveragePercent: 50,
	matchingProgressions: matches.map((match) => match.name),
	progressionCounts: matches.map((match) => ({
		chordProgression: match.chordProgression,
		name: match.name,
		scale: "major" as const,
		matchCount: 1,
		chorusMatchCount: 0,
		coveragePercent: 50,
		isCore: true
	})),
	biasOverrides: []
});

describe("buildProgressionGroupShares", () => {
	it("counts progressions by algo name, not literal roman spelling", () => {
		const coverages = [
			song("rotated-axis", [
				{ name: AXIS_NAME, chordProgression: MINOR_AXIS_SPELLING }
			]),
			song("authored-axis", [
				{ name: AXIS_NAME, chordProgression: AXIS_SPELLING }
			]),
			song("unrelated", [])
		];

		const shares = buildProgressionGroupShares(coverages);
		const happy = shares.find((item) => item.label === HAPPY_GROUP);
		const axis = shares.find((item) => item.label === AXIS_GROUP);

		const minorAxisShare = happy?.progressions.find(
			(progression) => progression.name === MINOR_AXIS_NAME
		);
		const axisShare = axis?.progressions.find(
			(progression) => progression.name === AXIS_NAME
		);

		expect(minorAxisShare?.songCount).toBe(0);
		expect(minorAxisShare?.sharePercent).toBe(0);
		expect(axisShare?.songCount).toBe(2);
	});
});

describe("songKeysMatchingGroupFilter", () => {
	it("filters by algo name when a progression is selected", () => {
		const coverages = [
			song("rotated-axis", [
				{ name: AXIS_NAME, chordProgression: MINOR_AXIS_SPELLING }
			]),
			song("true-minor-axis", [
				{ name: MINOR_AXIS_NAME, chordProgression: MINOR_AXIS_SPELLING }
			])
		];

		expect(
			songKeysMatchingGroupFilter(coverages, AXIS_GROUP, AXIS_NAME)
		).toEqual(new Set(["rotated-axis"]));

		expect(
			songKeysMatchingGroupFilter(coverages, HAPPY_GROUP, MINOR_AXIS_NAME)
		).toEqual(new Set(["true-minor-axis"]));
	});
});
