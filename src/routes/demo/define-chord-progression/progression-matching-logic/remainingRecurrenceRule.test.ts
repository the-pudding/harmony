import { describe, expect, it } from "vitest";
import songs from "../../../../../static/data/songs.json";
import coreProgressions from "$data/core-progressions.js";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";
import { groupSongs } from "../../../../data/songBrowser.js";
import type { GroupedSong, SongSection } from "../../../../data/songBrowser.js";
import type { ProgressionWithMatchStats } from "./progressionMatchAnalysis.js";
import { MIN_PROGRESSION_OCCURRENCES } from "./progressionMatchAnalysis.js";
import {
	claimedPositionsInSelectionOrder,
	emptyCoverage,
	greedilySelectProgressions,
	progressionInstances,
	type SectionCoverage
} from "./greedyProgressionSelection.js";
import { selectFinalProgressions } from "./finalProgressionSelection.js";

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
	chordProgression: string,
	isCoreProgression = true
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
	isCoreProgression,
	highlightPalette: { fill: "#000", border: "#000" }
});

const groupedSongByKey = (songKey: string): GroupedSong =>
	groupSongs(
		(songs as { songKey: string }[]).filter(
			(song) => song.songKey === songKey
		) as Parameters<typeof groupSongs>[0]
	)[0];

const instancesInsideClaim = (
	song: GroupedSong,
	candidate: ProgressionWithMatchStats,
	claim: SectionCoverage
): number => {
	const claimed = claim.map((positions) => new Set(positions));
	return progressionInstances(song, candidate).filter(
		({ sectionIndex, positions }) =>
			positions.every((position) => claimed[sectionIndex]?.has(position))
	).length;
};

const claimFillsAnEntireSection = (
	song: GroupedSong,
	claim: SectionCoverage
): boolean =>
	claim.some(
		(positions, sectionIndex) =>
			positions.length > 0 &&
			positions.length === song.sections[sectionIndex].parsedProgression.length
	);

// Every progression in the final answer has to justify itself on the chords it
// actually ended up with, not on the matches it had before earlier picks landed.
const expectEverySelectionStillRecurs = (song: GroupedSong): void => {
	const result = selectFinalProgressions(song, coreProgressions);
	const selected = [...result.coreSelected, ...result.gapSelected];
	const claims = claimedPositionsInSelectionOrder(
		song,
		selected,
		emptyCoverage(song)
	);

	selected.forEach((candidate, index) => {
		const instanceCount = instancesInsideClaim(song, candidate, claims[index]);
		const justified =
			instanceCount >= MIN_PROGRESSION_OCCURRENCES ||
			(instanceCount === 1 &&
				candidate.isCoreProgression &&
				claimFillsAnEntireSection(song, claims[index]));
		expect(
			justified,
			`${candidate.chordProgression} kept only ${instanceCount} instance(s) in ${song.songKey}`
		).toBe(true);
	});
};

describe("recurrence bar applies to the space left after earlier picks", () => {
	// Section 0 is fully claimed by the five-chord progression, which also
	// swallows both of the three-chord progression's instances there, leaving it
	// a single partial instance in section 1.
	const leftoverFragmentSong: GroupedSong = {
		songKey: "test__leftover-fragment",
		title: "Leftover Fragment",
		artists: ["Tester"],
		keyLabel: null,
		sections: [
			makeRomanSection(["I", "V", "vi", "IV", "V", "I", "V", "vi", "IV", "V"]),
			makeRomanSection(["ii", "IV", "V", "I", "iii"])
		]
	};

	it("drops a progression left with one partial instance", () => {
		const result = greedilySelectProgressions(
			leftoverFragmentSong,
			[makeCandidate("I-V-vi-IV-V"), makeCandidate("IV-V-I")],
			emptyCoverage(leftoverFragmentSong)
		);

		expect(result.selected.map((match) => match.chordProgression)).toEqual([
			"I-V-vi-IV-V"
		]);
	});

	it("leaves those chords uncovered rather than crediting the fragment", () => {
		const result = greedilySelectProgressions(
			leftoverFragmentSong,
			[makeCandidate("I-V-vi-IV-V"), makeCandidate("IV-V-I")],
			emptyCoverage(leftoverFragmentSong)
		);

		expect(result.coverage[1]).toEqual([]);
	});

	it("still selects a progression left with two instances", () => {
		const twoLeftSong: GroupedSong = {
			songKey: "test__two-left",
			title: "Two Left",
			artists: ["Tester"],
			keyLabel: null,
			sections: [
				makeRomanSection([
					"I",
					"V",
					"vi",
					"IV",
					"V",
					"I",
					"V",
					"vi",
					"IV",
					"V"
				]),
				makeRomanSection(["ii", "IV", "V", "I", "iii", "ii", "IV", "V", "I"])
			]
		};
		const result = greedilySelectProgressions(
			twoLeftSong,
			[makeCandidate("I-V-vi-IV-V"), makeCandidate("IV-V-I")],
			emptyCoverage(twoLeftSong)
		);

		expect(result.selected.map((match) => match.chordProgression)).toContain(
			"IV-V-I"
		);
	});

	// The single-instance exception survives: one match is enough when it fills a
	// whole section, which is how the core-progression rule has always read.
	const fullSectionSong: GroupedSong = {
		songKey: "test__full-section-leftover",
		title: "Full Section Leftover",
		artists: ["Tester"],
		keyLabel: null,
		sections: [
			makeRomanSection(["I", "V", "vi", "IV", "V", "I", "V", "vi", "IV", "V"]),
			makeRomanSection(["IV", "V", "I"])
		]
	};

	it("keeps a core progression whose one remaining instance fills a section", () => {
		const result = greedilySelectProgressions(
			fullSectionSong,
			[makeCandidate("I-V-vi-IV-V"), makeCandidate("IV-V-I")],
			emptyCoverage(fullSectionSong)
		);

		expect(result.selected.map((match) => match.chordProgression)).toContain(
			"IV-V-I"
		);
	});

	it("denies that exception to non-core gap candidates", () => {
		const result = greedilySelectProgressions(
			fullSectionSong,
			[makeCandidate("I-V-vi-IV-V"), makeCandidate("IV-V-I", false)],
			emptyCoverage(fullSectionSong)
		);

		expect(
			result.selected.map((match) => match.chordProgression)
		).not.toContain("IV-V-I");
	});
});

describe("miley cyrus — 7 things", () => {
	const sevenThings = groupedSongByKey("miley-cyrus__7-things");

	it("still offers somebody that i used to know as a candidate", () => {
		const result = selectFinalProgressions(sevenThings, coreProgressions);
		const candidate = result.coreMatches.find(
			(match) => match.chordProgression === "i-VII-VI-VII"
		);

		expect(candidate?.matchCount).toBeGreaterThanOrEqual(
			MIN_PROGRESSION_OCCURRENCES
		);
	});

	it("does not select it once emo walk down leaves it a single fragment", () => {
		const result = selectFinalProgressions(sevenThings, coreProgressions);

		expect(
			result.coreSelected.map((match) => match.chordProgression)
		).not.toContain("i-VII-VI-VII");
	});

	it("keeps emo walk down as the round-one winner", () => {
		const result = selectFinalProgressions(sevenThings, coreProgressions);

		expect(result.coreSelected[0].name).toBe("emo walk down");
	});

	it("justifies every progression it does select", () => {
		expectEverySelectionStillRecurs(sevenThings);
	});
});

describe("selections stay justified across real songs", () => {
	const songKeys = [
		"gotye__somebody-that-i-used-to-know",
		"jason-derulo__whatcha-say",
		"jonas-brothers__burnin-up",
		"lady-gaga__million-reasons",
		"psy__gangnam-style",
		"miley-cyrus__7-things"
	];

	for (const songKey of songKeys) {
		it(`${songKey} keeps only progressions that still recur`, () => {
			expectEverySelectionStillRecurs(groupedSongByKey(songKey));
		});
	}
});
