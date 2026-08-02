import { describe, expect, it } from "vitest";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";
import type { GroupedSong, SongSection } from "../../../../data/songBrowser.js";
import type { ProgressionWithMatchStats } from "./progressionMatchAnalysis.js";
import {
	computeCoveredPositionsBySection,
	computeGapOnlyCoveredPositionsBySection
} from "./progressionMatchAnalysis.js";
import { greedilySelectProgressions } from "./greedyProgressionSelection.js";

const makeRomanSection = (romanTokens: string[]): SongSection => ({
	label: null,
	chords: romanTokens,
	romanTokens,
	parsedProgression: romanTokensToParsedProgression(romanTokens, "major") ?? [],
	keyLabel: null,
	scale: "major"
});

const makeCandidate = (
	chordProgression: string,
	matchCount: number,
	coveragePercent: number
): ProgressionWithMatchStats => {
	const parsed = romanTokensToParsedProgression(
		chordProgression.split("-"),
		"major"
	)!;
	return {
		name: "",
		chordProgression,
		parsedProgression: parsed,
		scale: "major",
		description: "",
		matchCount,
		coveragePercent,
		isCoreProgression: false,
		highlightPalette: { fill: "#000", border: "#000" }
	};
};

const whatchaSayStyleSection = ["IV", "I", "vi", "V", "IV", "I", "vi"];

const partialCoreSong: GroupedSong = {
	songKey: "test__greedy-gap",
	title: "Greedy Gap Fixture",
	artists: ["Tester"],
	keyLabel: null,
	sections: [
		makeRomanSection(whatchaSayStyleSection),
		makeRomanSection(whatchaSayStyleSection)
	]
};

const coreCoverage = partialCoreSong.sections.map(() => [3, 4, 5]);

describe("greedilySelectProgressions — gap-only candidate coverage", () => {
	it("selects IV-I-vi using gap-only coverage against core", () => {
		const candidates = [
			makeCandidate("IV-I-vi", 2, 30),
			makeCandidate("vi-V-IV", 2, 25)
		];
		const result = greedilySelectProgressions(
			partialCoreSong,
			candidates,
			coreCoverage,
			{
				getCandidateCoverage: (candidate) =>
					computeGapOnlyCoveredPositionsBySection(
						partialCoreSong,
						candidate.parsedProgression,
						coreCoverage
					)
			}
		);
		expect(result.selected.map((match) => match.chordProgression)).toEqual([
			"IV-I-vi"
		]);
	});

	it("does not select a candidate whose gap-only coverage is empty", () => {
		const candidates = [makeCandidate("vi-V-IV", 6, 40)];
		const result = greedilySelectProgressions(
			partialCoreSong,
			candidates,
			coreCoverage,
			{
				getCandidateCoverage: (candidate) =>
					computeGapOnlyCoveredPositionsBySection(
						partialCoreSong,
						candidate.parsedProgression,
						coreCoverage
					)
			}
		);
		expect(result.selected).toHaveLength(0);
	});

	it("keeps gap selections disjoint from each other", () => {
		const song: GroupedSong = {
			songKey: "test__disjoint-gap",
			title: "Disjoint Gap",
			artists: ["Tester"],
			keyLabel: null,
			sections: [makeRomanSection(["I", "V", "vi", "IV", "I", "V"])]
		};
		const occupied = [[]];
		const candidates = [
			makeCandidate("I-V-vi", 1, 50),
			makeCandidate("vi-IV-I", 1, 40)
		];
		const result = greedilySelectProgressions(song, candidates, occupied, {
			getCandidateCoverage: (candidate) =>
				computeGapOnlyCoveredPositionsBySection(
					song,
					candidate.parsedProgression,
					occupied
				)
		});
		const selectedKeys = result.selected.map((match) => match.chordProgression);
		expect(selectedKeys).toHaveLength(1);
	});

	it("uses full coverage for core-style selection by default", () => {
		const song: GroupedSong = {
			songKey: "test__core-default",
			title: "Core Default",
			artists: ["Tester"],
			keyLabel: null,
			sections: [makeRomanSection(["I", "V", "vi", "IV", "I", "V", "vi", "IV"])]
		};
		const candidates = [makeCandidate("I-V-vi-IV", 2, 100)];
		const result = greedilySelectProgressions(
			song,
			candidates,
			song.sections.map(() => [])
		);
		const expectedCoverage = computeCoveredPositionsBySection(
			song,
			candidates[0].parsedProgression
		);
		expect(result.coverage).toEqual(expectedCoverage);
	});
});
