import type { CoreProgression } from "$data/core-progressions.js";
import type { GroupedSong } from "../../../../data/songBrowser.js";
import {
	computeCoveredPositionsBySection,
	computeGapOnlyCoveredPositionsBySection,
	computeProgressionMatches,
	countSectionsStartedByGapOnlyProgression,
	type ChordAnnotation,
	type ProgressionWithMatchStats
} from "./progressionMatchAnalysis.js";
import { selectCoreProgressions } from "./coreProgressionSelection.js";
import { computeGapFillProgressionMatches } from "./gapFillProgressionAnalysis.js";
import {
	coveragePercent,
	emptyCoverage,
	greedilySelectProgressions,
	mergeCoverage,
	type SectionCoverage,
	type SectionStartBiasOverride
} from "./greedyProgressionSelection.js";

export type FinalProgressionSelection = {
	coreMatches: ProgressionWithMatchStats[];
	gapCandidates: ProgressionWithMatchStats[];
	coreSelected: ProgressionWithMatchStats[];
	gapSelected: ProgressionWithMatchStats[];
	coverage: SectionCoverage;
	explainedPercent: number;
	biasOverrides: SectionStartBiasOverride[];
};

export const buildFinalChordAnnotations = (
	song: GroupedSong,
	selection: Pick<FinalProgressionSelection, "coreSelected" | "gapSelected">
): ChordAnnotation[] => {
	const annotations: ChordAnnotation[] = [];
	let accumulatedCoverage = emptyCoverage(song);

	for (const match of selection.coreSelected) {
		const highlightPositionsBySection = computeCoveredPositionsBySection(
			song,
			match.parsedProgression
		);
		annotations.push({
			parsedProgression: match.parsedProgression,
			palette: match.highlightPalette,
			isStrictSubset: match.isStrictSubset,
			chordProgression: match.chordProgression,
			highlightPositionsBySection
		});
		accumulatedCoverage = mergeCoverage(
			accumulatedCoverage,
			highlightPositionsBySection
		);
	}

	for (const match of selection.gapSelected) {
		const highlightPositionsBySection = computeGapOnlyCoveredPositionsBySection(
			song,
			match.parsedProgression,
			accumulatedCoverage
		);
		annotations.push({
			parsedProgression: match.parsedProgression,
			palette: match.highlightPalette,
			isStrictSubset: match.isStrictSubset,
			chordProgression: match.chordProgression,
			highlightPositionsBySection
		});
		accumulatedCoverage = mergeCoverage(
			accumulatedCoverage,
			highlightPositionsBySection
		);
	}

	return annotations;
};

export const selectFinalProgressions = (
	song: GroupedSong,
	coreProgressions: CoreProgression[]
): FinalProgressionSelection => {
	const coreMatches = computeProgressionMatches(song, coreProgressions);
	const coreSelection = selectCoreProgressions(song, coreMatches);
	const gapCandidates = computeGapFillProgressionMatches(
		song,
		coreSelection.coverage
	);
	const gapSelection = greedilySelectProgressions(
		song,
		gapCandidates,
		coreSelection.coverage,
		{
			getCandidateCoverage: (candidate) =>
				computeGapOnlyCoveredPositionsBySection(
					song,
					candidate.parsedProgression,
					coreSelection.coverage
				),
			getCandidateSectionStartCount: (candidate) =>
				countSectionsStartedByGapOnlyProgression(
					song,
					candidate.parsedProgression,
					coreSelection.coverage
				)
		}
	);

	return {
		coreMatches,
		gapCandidates,
		coreSelected: coreSelection.selected,
		gapSelected: gapSelection.selected,
		coverage: gapSelection.coverage,
		explainedPercent: Math.round(coveragePercent(song, gapSelection.coverage)),
		biasOverrides: [
			...coreSelection.biasOverrides,
			...gapSelection.biasOverrides
		]
	};
};
