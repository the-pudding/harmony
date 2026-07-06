import type { CoreProgression } from "$data/core-progressions.js";
import type { GroupedSong } from "../../progressions/songBrowser.js";
import { computeProgressionMatches } from "./progressionMatchAnalysis.js";
import { selectCoreProgressions } from "./coreProgressionSelection.js";
import { computeGapFillProgressionMatches } from "./gapFillProgressionAnalysis.js";
import {
	coveragePercent,
	greedilySelectProgressions,
	type SectionCoverage
} from "./greedyProgressionSelection.js";
import type { ProgressionWithMatchStats } from "./progressionMatchAnalysis.js";

export type FinalProgressionSelection = {
	coreMatches: ProgressionWithMatchStats[];
	gapCandidates: ProgressionWithMatchStats[];
	coreSelected: ProgressionWithMatchStats[];
	gapSelected: ProgressionWithMatchStats[];
	coverage: SectionCoverage;
	explainedPercent: number;
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
		{ clipOverlap: true }
	);

	return {
		coreMatches,
		gapCandidates,
		coreSelected: coreSelection.selected,
		gapSelected: gapSelection.selected,
		coverage: gapSelection.coverage,
		explainedPercent: Math.round(coveragePercent(song, gapSelection.coverage))
	};
};
