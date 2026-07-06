import type { GroupedSong } from "../../../../data/songBrowser.js";
import type { ProgressionWithMatchStats } from "./progressionMatchAnalysis.js";
import {
	greedilySelectProgressions,
	emptyCoverage,
	type SelectionResult
} from "./greedyProgressionSelection.js";

export const selectCoreProgressions = (
	song: GroupedSong,
	coreMatches: ProgressionWithMatchStats[]
): SelectionResult =>
	greedilySelectProgressions(song, coreMatches, emptyCoverage(song));
