import coreProgressions from "$data/core-progressions.js";
import type {
	GroupedSong,
	SongSection
} from "../../progressions/songBrowser.js";
import type { ParsedProgressionChord } from "../../../../chord-processing/types.js";
import { matchHighlightForCoreProgression } from "../components/progressionColors.js";
import {
	computeStatsForParsedProgression,
	MIN_PROGRESSION_OCCURRENCES,
	type ProgressionWithMatchStats
} from "./progressionMatchAnalysis.js";
import {
	MIN_PROGRESSION_LENGTH,
	isSelfRepeatingProgression
} from "./progressionConstraints.js";

const coreProgressionNameByChordProgression = new Map(
	coreProgressions.map((progression) => [
		progression.chordProgression,
		progression.name
	])
);

// A candidate progression carries both its display label (roman tokens, which
// are scale-blind) and its real, scale-aware parsed chords (used for matching).
type CandidateWindow = {
	romanTokens: string[];
	parsedProgression: ParsedProgressionChord[];
};

const contiguousWindowsFromSection = (
	section: SongSection
): CandidateWindow[] =>
	section.parsedProgression.flatMap((_, start) =>
		Array.from(
			{
				length: Math.max(
					0,
					section.parsedProgression.length - start - MIN_PROGRESSION_LENGTH + 1
				)
			},
			(_, lengthOffset) => {
				const end = start + MIN_PROGRESSION_LENGTH + lengthOffset;
				return {
					romanTokens: section.romanTokens.slice(start, end),
					parsedProgression: section.parsedProgression.slice(start, end)
				};
			}
		)
	);

const uniqueBy = <T>(items: T[], keyOf: (item: T) => string): T[] => {
	const seen = new Set<string>();
	return items.filter((item) => {
		const key = keyOf(item);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};

const toRecurringMatch = (
	song: GroupedSong,
	{ romanTokens, parsedProgression }: CandidateWindow
): ProgressionWithMatchStats | null => {
	if (
		romanTokens.length !== parsedProgression.length ||
		parsedProgression.length === 0
	) {
		return null;
	}
	const chordProgression = romanTokens.join("-");

	const stats = computeStatsForParsedProgression(song, parsedProgression);
	if (stats.matchCount < MIN_PROGRESSION_OCCURRENCES) return null;

	const name =
		coreProgressionNameByChordProgression.get(chordProgression) ?? "";
	const isCoreProgression = name !== "";

	return {
		name,
		chordProgression,
		parsedProgression,
		description: "",
		matchCount: stats.matchCount,
		coveragePercent: stats.coveragePercent,
		...matchHighlightForCoreProgression(isCoreProgression)
	};
};

const progressionLength = (match: ProgressionWithMatchStats): number =>
	match.chordProgression.split("-").length;

export function computeRecurringProgressionMatches(
	song: GroupedSong
): ProgressionWithMatchStats[] {
	const candidateWindows = song.sections.flatMap((section) =>
		contiguousWindowsFromSection(section)
	);
	const uniqueWindows = uniqueBy(candidateWindows, (window) =>
		window.romanTokens.join("-")
	);

	return uniqueWindows
		.map((window) => toRecurringMatch(song, window))
		.filter((match): match is ProgressionWithMatchStats => match !== null)
		.filter((match) => !isSelfRepeatingProgression(match.chordProgression))
		.sort(
			(a, b) =>
				b.coveragePercent - a.coveragePercent ||
				progressionLength(b) - progressionLength(a) ||
				a.chordProgression.localeCompare(b.chordProgression)
		);
}
