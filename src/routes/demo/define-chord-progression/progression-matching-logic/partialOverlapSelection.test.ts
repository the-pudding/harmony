import { describe, expect, it } from "vitest";
import songs from "../../../../../static/data/songs.json";
import coreProgressions from "$data/core-progressions.js";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";
import { groupSongs } from "../../../../data/songBrowser.js";
import type { GroupedSong, SongSection } from "../../../../data/songBrowser.js";
import type { ProgressionWithMatchStats } from "./progressionMatchAnalysis.js";
import { greedilySelectProgressions } from "./greedyProgressionSelection.js";
import {
	buildFinalChordAnnotations,
	selectFinalProgressions
} from "./finalProgressionSelection.js";

const makeRomanSection = (
	romanTokens: string[],
	label: string | null = null
): SongSection => ({
	label,
	chords: romanTokens,
	romanTokens,
	parsedProgression: romanTokensToParsedProgression(romanTokens, "major") ?? [],
	keyLabel: null,
	scale: "major"
});

const makeCandidate = (
	chordProgression: string
): ProgressionWithMatchStats => ({
	name: chordProgression,
	chordProgression,
	parsedProgression: romanTokensToParsedProgression(
		chordProgression.split("-"),
		"major"
	)!,
	scale: "major",
	description: "",
	matchCount: 0,
	coveragePercent: 0,
	isCoreProgression: true,
	highlightPalette: { fill: "#000", border: "#000" }
});

const repeat = <T>(items: T[], times: number): T[] =>
	Array.from({ length: times }, () => items).flat();

// Mirrors the Gotye shape: a dominant vamp owns most of the song, and a second
// progression owns a whole section while colliding with the vamp in one tail.
const vampSong: GroupedSong = {
	songKey: "test__partial-overlap-vamp",
	title: "Partial Overlap Fixture",
	artists: ["Tester"],
	keyLabel: null,
	sections: [
		makeRomanSection(repeat(["I", "V"], 8), "Verse"),
		makeRomanSection(repeat(["I", "V", "vi", "V"], 6), "Chorus"),
		makeRomanSection([...repeat(["I", "V"], 8), "vi", "V"], "Bridge")
	]
};

const CHORUS_INDEX = 1;

describe("greedy selection — partial overlap does not veto a whole progression", () => {
	it("selects the colliding progression for the space it still owns", () => {
		const result = greedilySelectProgressions(
			vampSong,
			[makeCandidate("I-V-I-V"), makeCandidate("I-V-vi-V")],
			vampSong.sections.map(() => [])
		);
		const selected = result.selected.map((match) => match.chordProgression);

		expect(selected[0]).toBe("I-V-I-V");
		expect(selected).toContain("I-V-vi-V");
	});

	it("gives the colliding progression the full chorus and none of the taken bridge tail", () => {
		const result = greedilySelectProgressions(
			vampSong,
			[makeCandidate("I-V-I-V"), makeCandidate("I-V-vi-V")],
			vampSong.sections.map(() => [])
		);
		const chorusLength =
			vampSong.sections[CHORUS_INDEX].parsedProgression.length;

		expect(result.coverage[CHORUS_INDEX]).toHaveLength(chorusLength);
		expect(new Set(result.coverage[CHORUS_INDEX]).size).toBe(chorusLength);
	});

	it("keeps coverage disjoint across the partially overlapping picks", () => {
		const result = greedilySelectProgressions(
			vampSong,
			[makeCandidate("I-V-I-V"), makeCandidate("I-V-vi-V")],
			vampSong.sections.map(() => [])
		);

		for (const sectionPositions of result.coverage) {
			expect(new Set(sectionPositions).size).toBe(sectionPositions.length);
		}
	});

	it("still rejects a progression whose every instance is already taken", () => {
		const fullyConsumedSong: GroupedSong = {
			songKey: "test__fully-consumed",
			title: "Fully Consumed",
			artists: ["Tester"],
			keyLabel: null,
			sections: [makeRomanSection(repeat(["I", "V", "vi", "IV"], 4))]
		};
		const result = greedilySelectProgressions(
			fullyConsumedSong,
			[makeCandidate("I-V-vi-IV"), makeCandidate("V-vi-IV")],
			fullyConsumedSong.sections.map(() => [])
		);

		expect(result.selected.map((match) => match.chordProgression)).toEqual([
			"I-V-vi-IV"
		]);
	});
});

const somebodyThatIUsedToKnow = groupSongs(
	(songs as { songKey: string }[]).filter(
		(song) => song.songKey === "gotye__somebody-that-i-used-to-know"
	) as Parameters<typeof groupSongs>[0]
)[0];

const sectionIndexByLabel = new Map(
	somebodyThatIUsedToKnow.sections.map((section, index) => [
		section.label,
		index
	])
);

describe("somebody that i used to know — chorus matches its dedicated core progression", () => {
	it("selects beat it vamp first and somebody that i used to know alongside it", () => {
		const result = selectFinalProgressions(
			somebodyThatIUsedToKnow,
			coreProgressions
		);
		const selected = result.coreSelected.map((match) => match.chordProgression);

		expect(selected[0]).toBe("i-VII-i-VII");
		expect(selected).toContain("i-VII-VI-VII");
	});

	it("covers the whole chorus rather than leaving it to gap fill", () => {
		const result = selectFinalProgressions(
			somebodyThatIUsedToKnow,
			coreProgressions
		);
		const chorusIndex = sectionIndexByLabel.get("Chorus")!;
		const chorusLength =
			somebodyThatIUsedToKnow.sections[chorusIndex].parsedProgression.length;

		expect(result.coverage[chorusIndex]).toHaveLength(chorusLength);
	});

	it("no longer invents the non-core i-VII-VI-VII-i-VII", () => {
		const result = selectFinalProgressions(
			somebodyThatIUsedToKnow,
			coreProgressions
		);

		expect(
			result.gapSelected.map((match) => match.chordProgression)
		).not.toContain("i-VII-VI-VII-i-VII");
	});

	it("annotates the chorus entirely with the somebody that i used to know highlight", () => {
		const result = selectFinalProgressions(
			somebodyThatIUsedToKnow,
			coreProgressions
		);
		const annotations = buildFinalChordAnnotations(
			somebodyThatIUsedToKnow,
			result
		);
		const chorusIndex = sectionIndexByLabel.get("Chorus")!;
		const chorusLength =
			somebodyThatIUsedToKnow.sections[chorusIndex].parsedProgression.length;
		const somebodyAnnotation = annotations.find(
			(annotation) => annotation.chordProgression === "i-VII-VI-VII"
		);

		expect(
			somebodyAnnotation?.highlightPositionsBySection?.[chorusIndex]
		).toHaveLength(chorusLength);
	});

	it("explains more of the song than the overlap-vetoed selection did", () => {
		const result = selectFinalProgressions(
			somebodyThatIUsedToKnow,
			coreProgressions
		);

		expect(result.explainedPercent).toBeGreaterThanOrEqual(96);
	});
});
