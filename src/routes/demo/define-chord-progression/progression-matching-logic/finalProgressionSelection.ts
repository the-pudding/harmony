import type { CoreProgression } from "$data/core-progressions.js";
import type { GroupedSong } from "../../../../data/songBrowser.js";
import {
	computeProgressionMatches,
	type ChordAnnotation,
	type ProgressionWithMatchStats
} from "./progressionMatchAnalysis.js";
import { selectCoreProgressions } from "./coreProgressionSelection.js";
import { extendCoreProgressionsPastPrefix } from "./coreProgressionExtension.js";
import { computeGapFillProgressionMatches } from "./gapFillProgressionAnalysis.js";
import {
	claimedPositionsInSelectionOrder,
	coveragePercent,
	emptyCoverage,
	greedilySelectProgressions,
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
	const selectedInOrder = [...selection.coreSelected, ...selection.gapSelected];
	const claims = claimedPositionsInSelectionOrder(
		song,
		selectedInOrder,
		emptyCoverage(song)
	);

	return selectedInOrder.map((match, index) => ({
		parsedProgression: match.parsedProgression,
		palette: match.highlightPalette,
		isStrictSubset: match.isStrictSubset,
		chordProgression: match.chordProgression,
		highlightPositionsBySection: claims[index],
		matchRomanNumeralsExactly: match.matchRomanNumeralsExactly ?? false
	}));
};

export const selectFinalProgressions = (
	song: GroupedSong,
	coreProgressions: CoreProgression[]
): FinalProgressionSelection => {
	const coreMatches = computeProgressionMatches(song, coreProgressions);
	const coreSelection = selectCoreProgressions(song, coreMatches);
	const extension = extendCoreProgressionsPastPrefix(song, coreSelection);
	const gapCandidates = computeGapFillProgressionMatches(
		song,
		extension.coverage
	);
	const gapSelection = greedilySelectProgressions(
		song,
		gapCandidates,
		extension.coverage
	);

	return {
		coreMatches,
		gapCandidates,
		coreSelected: extension.coreSelected,
		gapSelected: [...extension.extended, ...gapSelection.selected],
		coverage: gapSelection.coverage,
		explainedPercent: Math.round(coveragePercent(song, gapSelection.coverage)),
		biasOverrides: [
			...coreSelection.biasOverrides,
			...gapSelection.biasOverrides
		]
	};
};
