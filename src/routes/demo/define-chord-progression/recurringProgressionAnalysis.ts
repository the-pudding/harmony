import coreProgressions from "$data/core-progressions.js";
import type { GroupedSong } from "../progressions/songBrowser.js";
import { romanTokensToParsedProgression } from "../../../chord-processing/romanNumerals.js";
import {
	chordProgressionFromRomanTokens,
	computeStatsForParsedProgression,
	MIN_PROGRESSION_OCCURRENCES,
	type ProgressionWithMatchStats
} from "./progressionMatchAnalysis.js";

const coreProgressionNameByChordProgression = new Map(
	coreProgressions.map((progression) => [
		progression.chordProgression,
		progression.name
	])
);

const MIN_PROGRESSION_LENGTH = 3;

const contiguousWindowsFromTokens = (tokens: string[]): string[][] =>
	tokens.flatMap((_, start) =>
		Array.from(
			{
				length: Math.max(0, tokens.length - start - MIN_PROGRESSION_LENGTH + 1)
			},
			(_, lengthOffset) =>
				tokens.slice(start, start + MIN_PROGRESSION_LENGTH + lengthOffset)
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
	romanTokens: string[]
): ProgressionWithMatchStats | null => {
	const parsed = romanTokensToParsedProgression(romanTokens);
	const chordProgression = chordProgressionFromRomanTokens(romanTokens);
	if (!parsed || !chordProgression) return null;

	const stats = computeStatsForParsedProgression(song, parsed);
	if (stats.matchCount < MIN_PROGRESSION_OCCURRENCES) return null;

	return {
		name: coreProgressionNameByChordProgression.get(chordProgression) ?? "",
		chordProgression,
		description: "",
		matchCount: stats.matchCount,
		coveragePercent: stats.coveragePercent
	};
};

const progressionLength = (match: ProgressionWithMatchStats): number =>
	match.chordProgression.split("-").length;

export function computeRecurringProgressionMatches(
	song: GroupedSong
): ProgressionWithMatchStats[] {
	const candidateWindows = song.sections.flatMap((section) =>
		contiguousWindowsFromTokens(section.romanTokens)
	);
	const uniqueWindows = uniqueBy(candidateWindows, (tokens) =>
		tokens.join("-")
	);

	return uniqueWindows
		.map((romanTokens) => toRecurringMatch(song, romanTokens))
		.filter((match): match is ProgressionWithMatchStats => match !== null)
		.sort(
			(a, b) =>
				b.coveragePercent - a.coveragePercent ||
				progressionLength(b) - progressionLength(a) ||
				a.chordProgression.localeCompare(b.chordProgression)
		);
}
