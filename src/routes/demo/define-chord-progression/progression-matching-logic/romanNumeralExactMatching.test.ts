import { describe, expect, it } from "vitest";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";
import type { ScaleName } from "../../../../chord-processing/scales.js";
import type { GroupedSong, SongSection } from "../../../../data/songBrowser.js";
import type { CoreProgression } from "$data/core-progressions.js";
import { matchSongV2 } from "../../match-algo-v2/match-algo-v2-logic/matchSongV2.js";
import { countContiguousRepeats } from "../../match-algo-v2/match-algo-v2-logic/candidates.js";
import {
	matchSectionProgressionExactly,
	tonicOffsetAt
} from "./progressionMatchAnalysis.js";

const makeSection = (
	romanTokens: string[],
	scale: ScaleName = "major"
): SongSection => ({
	label: null,
	chords: romanTokens,
	romanTokens,
	parsedProgression: romanTokensToParsedProgression(romanTokens, scale) ?? [],
	keyLabel: null,
	scale
});

const makeSong = (sections: SongSection[]): GroupedSong => ({
	songKey: "test__exact-match",
	title: "Exact Match Fixture",
	artists: ["Tester"],
	keyLabel: null,
	sections
});

const repeated = (tokens: string[]): string[] => [...tokens, ...tokens];

const MINOR_DESCENT_NAME = "minor descent";
const MAJOR_DESCENT_NAME = "major descent";

const minorDescentCore: CoreProgression = {
	name: MINOR_DESCENT_NAME,
	chordProgression: "i-VII-VI-III",
	scale: "minor",
	description: ""
};

const majorDescentCore: CoreProgression = {
	name: MAJOR_DESCENT_NAME,
	chordProgression: "vi-V-IV-I",
	scale: "major",
	description: ""
};

const matchedCoreNames = (
	section: SongSection,
	cores: CoreProgression[]
): string[] =>
	matchSongV2(makeSong([section]), cores)
		.matches.filter((match) => match.isCoreProgression)
		.map((match) => match.name);

describe("exact roman numeral matching in matchSongV2", () => {
	it("does not match i-VII-VI-III against a major section playing vi-V-IV-I", () => {
		const section = makeSection(repeated(["vi", "V", "IV", "I"]));
		expect(matchedCoreNames(section, [minorDescentCore])).toEqual([]);
	});

	it("does not match vi-V-IV-I against a minor section playing i-VII-VI-III", () => {
		const section = makeSection(repeated(["i", "VII", "VI", "III"]), "minor");
		expect(matchedCoreNames(section, [majorDescentCore])).toEqual([]);
	});

	it("matches each core only on its own roman numerals", () => {
		const majorSection = makeSection(repeated(["vi", "V", "IV", "I"]));
		const minorSection = makeSection(
			repeated(["i", "VII", "VI", "III"]),
			"minor"
		);
		const cores = [minorDescentCore, majorDescentCore];
		expect(matchedCoreNames(majorSection, cores)).toEqual([MAJOR_DESCENT_NAME]);
		expect(matchedCoreNames(minorSection, cores)).toEqual([MINOR_DESCENT_NAME]);
	});

	it("matches the same tonic-relative chords spelled in a different scale", () => {
		const section = makeSection(repeated(["i", "bVII", "bVI", "bIII"]));
		expect(matchedCoreNames(section, [minorDescentCore])).toEqual([
			MINOR_DESCENT_NAME
		]);
	});

	it("keeps transposed non-core slices in one song as separate progressions", () => {
		const tonicSection = makeSection(repeated(["I", "IV", "V"]));
		const transposedSection = makeSection(repeated(["IV", "bVII", "I"]));
		const result = matchSongV2(makeSong([tonicSection, transposedSection]), []);
		expect(
			result.matches.map((match) => match.chordProgression).sort()
		).toEqual(["I-IV-V", "IV-bVII-I"]);
	});
});

describe("matchSectionProgressionExactly", () => {
	it("only keeps matches whose first chord sits on the search tonic offset", () => {
		const section = makeSection(["I", "IV", "V", "II", "V", "VI"]);
		const unit = section.parsedProgression.slice(0, 3);
		const matches = matchSectionProgressionExactly(
			section,
			unit,
			tonicOffsetAt(section, 0)
		);
		expect(matches.map((match) => match.start)).toEqual([0]);
	});
});

describe("countContiguousRepeats", () => {
	it("does not count a transposed copy of the unit as a repeat", () => {
		const section = makeSection(["I", "IV", "V", "II", "V", "VI"]);
		const unit = section.parsedProgression.slice(0, 3);
		expect(
			countContiguousRepeats(section, 0, unit, tonicOffsetAt(section, 0))
		).toEqual({ repeatCount: 1, coveredLength: unit.length });
	});

	it("counts back-to-back copies on the same roman numerals", () => {
		const section = makeSection(repeated(["I", "IV", "V"]));
		const unit = section.parsedProgression.slice(0, 3);
		expect(
			countContiguousRepeats(section, 0, unit, tonicOffsetAt(section, 0))
		).toEqual({ repeatCount: 2, coveredLength: unit.length * 2 });
	});
});
