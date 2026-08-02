import { describe, expect, it } from "vitest";
import songs from "../../../../../static/data/songs.json";
import coreProgressions from "$data/core-progressions.js";
import type { GroupedSong, SongSection } from "../../../../data/songBrowser.js";
import { groupSongs } from "../../../../data/songBrowser.js";
import {
	buildColoredHighlightSegments,
	computeCoveredPositionsBySection,
	computeGapOnlyCoveredPositionsBySection,
	type ChordAnnotation
} from "./progressionMatchAnalysis.js";
import {
	buildFinalChordAnnotations,
	selectFinalProgressions
} from "./finalProgressionSelection.js";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";

const makeRomanSection = (romanTokens: string[]): SongSection => ({
	label: null,
	chords: romanTokens,
	romanTokens,
	parsedProgression: romanTokensToParsedProgression(romanTokens, "major") ?? [],
	keyLabel: null,
	scale: "major"
});

const whatchaSaySong = groupSongs(
	(songs as { songKey: string }[]).filter(
		(s) => s.songKey === "jason-derulo__whatcha-say"
	) as Parameters<typeof groupSongs>[0]
)[0];

const OPENING_ROMAN_TOKENS = ["IV", "I", "vi"] as const;
const OPENING_POSITIONS = [0, 1, 2] as const;

const annotationsHighlightOpening = (
	annotations: ChordAnnotation[],
	sectionIndex: number
): boolean => {
	const section = whatchaSaySong.sections[sectionIndex];
	const segments = buildColoredHighlightSegments(
		section,
		sectionIndex,
		annotations
	);
	return OPENING_POSITIONS.every((position) => {
		const segment = segments.find((entry) => entry.indices.includes(position));
		return segment?.palette !== null && segment?.palette !== undefined;
	});
};

const hasFullProgressionHighlight = (
	annotations: ChordAnnotation[],
	chordProgression: string,
	sectionIndex: number
): boolean => {
	const progressionLength = chordProgression.split("-").length;
	const section = whatchaSaySong.sections[sectionIndex];
	const segments = buildColoredHighlightSegments(
		section,
		sectionIndex,
		annotations
	);
	return segments.some(
		(segment) =>
			segment.chordProgression === chordProgression &&
			segment.palette !== null &&
			segment.indices.length >= progressionLength
	);
};

describe("whatcha say — strict gap fill with whatcha say core progression", () => {
	it("core selection picks IV-I-vi-V for the main loop", () => {
		const result = selectFinalProgressions(whatchaSaySong, coreProgressions);
		expect(result.coreSelected.map((match) => match.chordProgression)).toEqual([
			"IV-I-vi-V"
		]);
	});

	it("surfaces IV-I-vi in gap candidates with gap-only instances outside core", () => {
		const result = selectFinalProgressions(whatchaSaySong, coreProgressions);
		const match = result.gapCandidates.find(
			(candidate) => candidate.chordProgression === "IV-I-vi"
		);
		expect(match).toBeDefined();
		expect(match!.matchCount).toBeGreaterThanOrEqual(2);
	});

	it("does not surface vi-V-IV in gap candidates or selection", () => {
		const result = selectFinalProgressions(whatchaSaySong, coreProgressions);
		const candidateKeys = result.gapCandidates.map(
			(match) => match.chordProgression
		);
		const selectedKeys = result.gapSelected.map(
			(match) => match.chordProgression
		);
		expect(candidateKeys).not.toContain("vi-V-IV");
		expect(selectedKeys).not.toContain("vi-V-IV");
	});

	it("gap-fill selection covers the recurring IV-I-vi opening", () => {
		const result = selectFinalProgressions(whatchaSaySong, coreProgressions);
		const gapKeys = result.gapSelected.map((match) => match.chordProgression);
		const coversOpening = gapKeys.some(
			(progression) =>
				progression === "IV-I-vi" || progression.startsWith("IV-I-vi-")
		);
		expect(coversOpening).toBe(true);
	});

	it("highlights the opening IV-I-vi in chorus and hook sections", () => {
		const result = selectFinalProgressions(whatchaSaySong, coreProgressions);
		const annotations = buildFinalChordAnnotations(whatchaSaySong, result);

		const sectionIndexesByLabel = new Map(
			whatchaSaySong.sections.map((section, index) => [section.label, index])
		);

		for (const label of ["Chorus", "Hook"] as const) {
			const sectionIndex = sectionIndexesByLabel.get(label);
			expect(sectionIndex).toBeDefined();
			expect(annotationsHighlightOpening(annotations, sectionIndex!)).toBe(
				true
			);
		}
	});

	it("gap-only IV-I-vi coverage excludes positions occupied by core", () => {
		const whatchaSayStyleSection = ["IV", "I", "vi", "V", "IV", "I", "vi"];
		const fixtureSong: GroupedSong = {
			songKey: "test__gap-only-whatcha",
			title: "Fixture",
			artists: ["Tester"],
			keyLabel: null,
			sections: [makeRomanSection(whatchaSayStyleSection)]
		};
		const coreParsed = romanTokensToParsedProgression(
			["I", "bVII", "IV"],
			"major"
		)!;
		const gapParsed = romanTokensToParsedProgression(
			[...OPENING_ROMAN_TOKENS],
			"major"
		)!;
		const coreCoverage = computeCoveredPositionsBySection(
			fixtureSong,
			coreParsed
		);
		const gapOnlyCoverage = computeGapOnlyCoveredPositionsBySection(
			fixtureSong,
			gapParsed,
			coreCoverage
		);

		expect(gapOnlyCoverage[0]).toEqual([...OPENING_POSITIONS]);
		expect(gapOnlyCoverage[0]).not.toContain(4);
	});

	it("every selected gap progression highlights at least one full instance", () => {
		const result = selectFinalProgressions(whatchaSaySong, coreProgressions);
		const annotations = buildFinalChordAnnotations(whatchaSaySong, result);

		for (const match of result.gapSelected) {
			const highlightsFullInstance = whatchaSaySong.sections.some(
				(_section, sectionIndex) =>
					hasFullProgressionHighlight(
						annotations,
						match.chordProgression,
						sectionIndex
					)
			);
			expect(highlightsFullInstance).toBe(true);
		}
	});
});
