import { describe, expect, it } from "vitest";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";
import type { GroupedSong, SongSection } from "../../../../data/songBrowser.js";
import { computeProgressionMatches } from "./progressionMatchAnalysis.js";
import type { ProgressionWithMatchStats } from "./progressionMatchAnalysis.js";
import { greedilySelectProgressions } from "./greedyProgressionSelection.js";
import type { CoreProgression } from "$data/core-progressions.js";
import coreProgressions, {
	BACK_TO_BACK_REPEAT
} from "$data/core-progressions.js";
import { chordProgressionVariants } from "$data/core-progressions.util.js";
import { MIN_PROGRESSION_LENGTH } from "./progressionConstraints.js";

const makeSection = (
	romanTokens: string[],
	scale: "major" | "minor" = "major"
): SongSection => ({
	label: null,
	chords: romanTokens,
	romanTokens,
	parsedProgression: romanTokensToParsedProgression(romanTokens, scale) ?? [],
	keyLabel: null,
	scale
});

const makeSong = (sections: SongSection[]): GroupedSong => ({
	songKey: "test__contiguous",
	title: "Contiguous Fixture",
	artists: ["Tester"],
	keyLabel: null,
	sections
});

const miniAxis: CoreProgression = {
	name: "(mini)axis of awesome",
	chordProgression: "I-V-vi",
	scale: "major",
	matchRomanNumeralsExactly: true,
	minimumContiguousMatches: BACK_TO_BACK_REPEAT,
	description: ""
};

const withoutRule: CoreProgression = {
	...miniAxis,
	minimumContiguousMatches: undefined
};

describe("computeProgressionMatches — minimumContiguousMatches", () => {
	it("rejects two occurrences separated by other chords", () => {
		const song = makeSong([
			makeSection(["I", "V", "vi", "ii", "IV", "I", "V", "vi", "ii", "IV"])
		]);
		expect(computeProgressionMatches(song, [miniAxis])).toHaveLength(0);
	});

	it("accepts the same song when the rule is absent", () => {
		const song = makeSong([
			makeSection(["I", "V", "vi", "ii", "IV", "I", "V", "vi", "ii", "IV"])
		]);
		expect(computeProgressionMatches(song, [withoutRule])).toHaveLength(1);
	});

	it("accepts two occurrences that sit back-to-back", () => {
		const song = makeSong([
			makeSection(["I", "V", "vi", "I", "V", "vi", "ii", "IV"])
		]);
		expect(computeProgressionMatches(song, [miniAxis])).toHaveLength(1);
	});

	it("accepts a back-to-back pair found in only one of several sections", () => {
		const song = makeSong([
			makeSection(["I", "V", "vi", "ii", "IV", "I", "V", "vi", "ii", "IV"]),
			makeSection(["I", "V", "vi", "I", "V", "vi"])
		]);
		expect(computeProgressionMatches(song, [miniAxis])).toHaveLength(1);
	});

	it("does not count occurrences in different sections as contiguous", () => {
		const song = makeSong([
			makeSection(["I", "V", "vi"]),
			makeSection(["I", "V", "vi"])
		]);
		expect(computeProgressionMatches(song, [miniAxis])).toHaveLength(0);
	});
});

describe("greedilySelectProgressions — minimumContiguousMatches after earlier picks", () => {
	// Three back-to-back occurrences plus two scattered ones: enough
	// occurrences survive an earlier pick eating the run, but the run itself
	// is what the rule is about, so the candidate must still be dropped.
	const song = makeSong([
		makeSection(["I", "V", "vi", "I", "V", "vi", "I", "V", "vi"]),
		makeSection(["I", "V", "vi", "ii", "IV", "I", "V", "vi", "ii", "IV"])
	]);

	const candidate: ProgressionWithMatchStats = {
		...miniAxis,
		chordProgression: "I-V-vi",
		parsedProgression: romanTokensToParsedProgression(
			["I", "V", "vi"],
			"major"
		)!,
		matchCount: 5,
		coveragePercent: 0,
		isCoreProgression: true,
		highlightPalette: { fill: "#000", border: "#000" }
	};

	const runFreeCoverage = [[], []];
	const runClaimedCoverage = [[3, 4, 5, 6, 7, 8], []];

	it("keeps the candidate while its back-to-back run is untouched", () => {
		const result = greedilySelectProgressions(
			song,
			[candidate],
			runFreeCoverage
		);
		expect(result.selected.map((match) => match.chordProgression)).toEqual([
			"I-V-vi"
		]);
	});

	it("drops the candidate once an earlier pick claimed the run, despite surviving occurrences", () => {
		const result = greedilySelectProgressions(
			song,
			[candidate],
			runClaimedCoverage
		);
		expect(result.selected).toEqual([]);
	});
});

describe("core-progressions data — back-to-back rule on short progressions", () => {
	const isShort = (progression: CoreProgression): boolean =>
		chordProgressionVariants(progression.chordProgression).every(
			(variant) => variant.split("-").length === MIN_PROGRESSION_LENGTH
		);

	it("every shortest-length core progression requires a back-to-back repeat", () => {
		const missing = coreProgressions
			.filter(isShort)
			.filter(
				(progression) =>
					progression.minimumContiguousMatches !== BACK_TO_BACK_REPEAT
			)
			.map((progression) => progression.name);
		expect(missing).toEqual([]);
	});

	it("leaves longer core progressions unconstrained", () => {
		const constrained = coreProgressions
			.filter((progression) => !isShort(progression))
			.filter(
				(progression) => progression.minimumContiguousMatches !== undefined
			)
			.map((progression) => progression.name);
		expect(constrained).toEqual([]);
	});
});
