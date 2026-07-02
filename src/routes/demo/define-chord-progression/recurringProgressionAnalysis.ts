import type { GroupedSong } from "../progressions/songBrowser.js";
import { romanTokensToParsedProgression } from "../../../chord-processing/romanNumerals.js";
import {
	chordProgressionFromRomanTokens,
	computeStatsForParsedProgression,
	type ProgressionWithMatchStats
} from "./progressionMatchAnalysis.js";

const MIN_PROGRESSION_LENGTH = 3;
const MIN_OCCURRENCES = 2;

const tokensMatchAt = (
	haystack: string[],
	needle: string[],
	start: number
): boolean =>
	needle.every((token, offset) => haystack[start + offset] === token);

const countSubsequenceInTokens = (
	haystack: string[],
	needle: string[]
): number => {
	const lastStart = haystack.length - needle.length;
	return Array.from(
		{ length: Math.max(0, lastStart + 1) },
		(_, start) => start
	).filter((start) => tokensMatchAt(haystack, needle, start)).length;
};

const countOccurrencesInSong = (
	song: GroupedSong,
	romanTokens: string[]
): number =>
	song.sections.reduce(
		(total, section) =>
			total + countSubsequenceInTokens(section.romanTokens, romanTokens),
		0
	);

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
	if (countOccurrencesInSong(song, romanTokens) < MIN_OCCURRENCES) return null;

	const stats = computeStatsForParsedProgression(song, parsed);
	return {
		name: chordProgression,
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
