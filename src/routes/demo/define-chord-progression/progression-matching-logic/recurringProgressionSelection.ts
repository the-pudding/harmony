import type { GroupedSong } from "../../progressions/songBrowser.js";
import type { ProgressionWithMatchStats } from "./progressionMatchAnalysis.js";
import {
	greedilySelectProgressions,
	type SelectionResult,
	type SectionCoverage
} from "./greedyProgressionSelection.js";

export const selectNonCoreProgressions = (
	song: GroupedSong,
	recurringMatches: ProgressionWithMatchStats[],
	initialCoverage: SectionCoverage
): SelectionResult => {
	const nonCoreMatches = recurringMatches.filter((match) => match.name === "");
	return greedilySelectProgressions(song, nonCoreMatches, initialCoverage);
};
