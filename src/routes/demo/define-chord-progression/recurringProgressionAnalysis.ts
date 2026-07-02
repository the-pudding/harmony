import type { CoreProgression } from "$data/core-progressions.js";
import type { GroupedSong } from "../progressions/songBrowser.js";
import { romanTokensToParsedProgression } from "../../../chord-processing/romanNumerals.js";
import {
	abstractProgressionKey,
	chordProgressionFromRomanTokens,
	computeStatsForParsedProgression,
	type ProgressionWithMatchStats
} from "./progressionMatchAnalysis.js";

const MIN_PROGRESSION_LENGTH = 3;
const MIN_OCCURRENCES = 2;
const MAX_PROGRESSION_LENGTH = 6;

const countTokenOccurrencesInSong = (
	song: GroupedSong,
	romanTokens: string[]
): number =>
	song.sections.reduce((sectionTotal, section) => {
		const limit = section.romanTokens.length - romanTokens.length + 1;
		let sectionCount = 0;
		outer: for (let start = 0; start < limit; start += 1) {
			for (let offset = 0; offset < romanTokens.length; offset += 1) {
				if (section.romanTokens[start + offset] !== romanTokens[offset]) {
					continue outer;
				}
			}
			sectionCount += 1;
		}
		return sectionTotal + sectionCount;
	}, 0);

const buildCoreProgressionKeys = (coreProgressions: CoreProgression[]): Set<string> => {
	const keys = new Set<string>();
	for (const progression of coreProgressions) {
		const parsed = romanTokensToParsedProgression(
			progression.chordProgression.split("-")
		);
		if (parsed) keys.add(abstractProgressionKey(parsed));
	}
	return keys;
};

const longestQualifyingProgressionFromPosition = (
	song: GroupedSong,
	sectionRomanTokens: string[],
	start: number
): string[] | null => {
	const maxLength = Math.min(
		MAX_PROGRESSION_LENGTH,
		sectionRomanTokens.length - start
	);
	let bestLength = 0;

	for (
		let length = MIN_PROGRESSION_LENGTH;
		length <= maxLength;
		length += 1
	) {
		const romanTokens = sectionRomanTokens.slice(start, start + length);
		if (countTokenOccurrencesInSong(song, romanTokens) < MIN_OCCURRENCES) continue;
		if (!romanTokensToParsedProgression(romanTokens)) continue;
		bestLength = length;
	}

	return bestLength > 0
		? sectionRomanTokens.slice(start, start + bestLength)
		: null;
};

const progressionContainsContiguousSubsequence = (
	progressionTokens: string[],
	candidateTokens: string[]
): boolean => {
	if (candidateTokens.length >= progressionTokens.length) return false;
	const limit = progressionTokens.length - candidateTokens.length + 1;
	outer: for (let start = 0; start < limit; start += 1) {
		for (let offset = 0; offset < candidateTokens.length; offset += 1) {
			if (progressionTokens[start + offset] !== candidateTokens[offset]) {
				continue outer;
			}
		}
		return true;
	}
	return false;
};

const filterSubsumedProgressions = (
	matches: ProgressionWithMatchStats[]
): ProgressionWithMatchStats[] => {
	const tokensByProgression = matches.map((match) => match.chordProgression.split("-"));
	return matches.filter(
		(match, index) =>
			!matches.some((other, otherIndex) => {
				if (index === otherIndex) return false;
				return progressionContainsContiguousSubsequence(
					tokensByProgression[otherIndex],
					tokensByProgression[index]
				);
			})
	);
};

export function computeRecurringProgressionMatches(
	song: GroupedSong,
	coreProgressions: CoreProgression[]
): ProgressionWithMatchStats[] {
	const coreProgressionKeys = buildCoreProgressionKeys(coreProgressions);
	const candidatesByAbstractKey = new Map<string, ProgressionWithMatchStats>();

	for (const section of song.sections) {
		for (let start = 0; start < section.romanTokens.length; start += 1) {
			const romanTokens = longestQualifyingProgressionFromPosition(
				song,
				section.romanTokens,
				start
			);
			if (!romanTokens) continue;

			const parsed = romanTokensToParsedProgression(romanTokens);
			const chordProgression = chordProgressionFromRomanTokens(romanTokens);
			if (!parsed || !chordProgression) continue;

			const abstractKey = abstractProgressionKey(parsed);
			if (coreProgressionKeys.has(abstractKey)) continue;

			const stats = computeStatsForParsedProgression(song, parsed);
			if (stats.matchCount < MIN_OCCURRENCES) continue;

			const existing = candidatesByAbstractKey.get(abstractKey);
			if (
				existing &&
				existing.chordProgression.split("-").length >= romanTokens.length
			) {
				continue;
			}

			candidatesByAbstractKey.set(abstractKey, {
				name: chordProgression,
				chordProgression,
				description: "",
				matchCount: stats.matchCount,
				coveragePercent: stats.coveragePercent
			});
		}
	}

	return filterSubsumedProgressions([...candidatesByAbstractKey.values()]).sort(
		(a, b) => b.coveragePercent - a.coveragePercent
	);
}
