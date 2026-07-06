import { describe, expect, it } from "vitest";
import songs from "../../../../../static/data/songs.json";
import coreProgressions from "$data/core-progressions.js";
import { groupSongs } from "../../progressions/songBrowser.js";
import {
	buildColoredHighlightSegments,
	computeCoveredPositionsBySection,
	type ChordAnnotation
} from "./progressionMatchAnalysis.js";
import { selectFinalProgressions } from "./finalProgressionSelection.js";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";

const whatchaSaySong = groupSongs(
	(songs as { songKey: string }[]).filter(
		(s) => s.songKey === "jason-derulo__whatcha-say"
	) as Parameters<typeof groupSongs>[0]
)[0];

const OPENING_ROMAN_TOKENS = ["IV", "I", "vi"] as const;
const OPENING_POSITIONS = [0, 1, 2] as const;

const sectionOpeningUncovered = (
	sectionIndex: number,
	coverage: number[][]
): number[] =>
	OPENING_POSITIONS.filter((position) => !coverage[sectionIndex]?.includes(position));

const annotationsHighlightOpening = (
	annotations: ChordAnnotation[],
	sectionIndex: number
): boolean => {
	const section = whatchaSaySong.sections[sectionIndex];
	const segments = buildColoredHighlightSegments(section, annotations);
	return OPENING_POSITIONS.every((position) => {
		const segment = segments.find((entry) => entry.indices.includes(position));
		return segment?.palette !== null && segment?.palette !== undefined;
	});
};

describe("whatcha say — IV-I-vi gap fill after mixolydian vamp core", () => {
	it("core selection picks I-bVII-IV (V-IV-I) for the inner loop", () => {
		const result = selectFinalProgressions(whatchaSaySong, coreProgressions);
		expect(result.coreSelected.map((match) => match.chordProgression)).toEqual([
			"I-bVII-IV"
		]);
	});

	it("surfaces IV-I-vi in gap candidates even though it partially overlaps the core match", () => {
		const result = selectFinalProgressions(whatchaSaySong, coreProgressions);
		const match = result.gapCandidates.find(
			(candidate) => candidate.chordProgression === "IV-I-vi"
		);
		expect(match).toBeDefined();
		expect(match!.matchCount).toBeGreaterThanOrEqual(2);
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

	it("highlights the opening IV-I-vi in pre-chorus, chorus, and bridge", () => {
		const result = selectFinalProgressions(whatchaSaySong, coreProgressions);
		const annotations: ChordAnnotation[] = [
			...result.coreSelected,
			...result.gapSelected
		].map((match) => ({
			parsedProgression: match.parsedProgression,
			palette: match.highlightPalette
		}));

		const sectionIndexesByLabel = new Map(
			whatchaSaySong.sections.map((section, index) => [section.label, index])
		);

		for (const label of ["Pre-Chorus", "Chorus", "Bridge"] as const) {
			const sectionIndex = sectionIndexesByLabel.get(label);
			expect(sectionIndex).toBeDefined();
			expect(annotationsHighlightOpening(annotations, sectionIndex!)).toBe(true);
		}
	});

	it("clips IV-I-vi coverage so only uncovered opening positions are newly filled", () => {
		const coreParsed = romanTokensToParsedProgression(
			["I", "bVII", "IV"],
			"major"
		)!;
		const gapParsed = romanTokensToParsedProgression(
			[...OPENING_ROMAN_TOKENS],
			"major"
		)!;
		const coreCoverage = computeCoveredPositionsBySection(
			whatchaSaySong,
			coreParsed
		);
		const gapCoverage = computeCoveredPositionsBySection(
			whatchaSaySong,
			gapParsed
		);

		for (const sectionIndex of [1, 2, 3]) {
			expect(sectionOpeningUncovered(sectionIndex, coreCoverage)).toEqual([
				...OPENING_POSITIONS
			]);
			expect(
				OPENING_POSITIONS.every((position) =>
					gapCoverage[sectionIndex]?.includes(position)
				)
			).toBe(true);
		}
	});
});
