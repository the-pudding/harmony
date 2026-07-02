import type { CoreProgression } from "$data/core-progressions.js";
import type { GroupedSong, SongSection } from "../progressions/songBrowser.js";
import { romanTokensToParsedProgression } from "../../../chord-processing/romanNumerals.js";
import {
	findSubProgressionMatches,
	isPositionInMatch,
	toAbstractProgression
} from "../../../chord-processing/match-chord-progressions/index.js";
import type {
	ParsedProgressionChord,
	SubProgressionMatch
} from "../../../chord-processing/types.js";

export type ProgressionWithMatchStats = {
	name: string;
	chordProgression: string;
	description: string;
	matchCount: number;
	coveragePercent: number;
};

export type CoreProgressionWithStats = ProgressionWithMatchStats;

export type ChordHighlightSegment = {
	matchIndex: number;
	indices: number[];
};

export const abstractProgressionKey = (
	parsed: ParsedProgressionChord[]
): string => JSON.stringify(toAbstractProgression(parsed));

const countCoveredPositions = (
	sectionLength: number,
	matches: ReturnType<typeof findSubProgressionMatches>
): number =>
	Array.from({ length: sectionLength }, (_, position) =>
		matches.some((match) => isPositionInMatch(position, match, sectionLength))
	).filter(Boolean).length;

export const computeStatsForParsedProgression = (
	song: GroupedSong,
	parsed: ParsedProgressionChord[]
): { matchCount: number; coveragePercent: number } => {
	const totalChords = song.sections.reduce(
		(sum, section) => sum + section.parsedProgression.length,
		0
	);
	if (totalChords === 0) return { matchCount: 0, coveragePercent: 0 };

	const stats = song.sections.reduce(
		(accumulator, section) => {
			const matches = findSubProgressionMatches(
				section.parsedProgression,
				parsed
			);
			return {
				matchCount: accumulator.matchCount + matches.length,
				coveredPositions:
					accumulator.coveredPositions +
					countCoveredPositions(section.parsedProgression.length, matches)
			};
		},
		{ matchCount: 0, coveredPositions: 0 }
	);

	return {
		matchCount: stats.matchCount,
		coveragePercent: (stats.coveredPositions / totalChords) * 100
	};
};

export const chordProgressionFromRomanTokens = (
	romanTokens: string[]
): string | null => {
	const parsed = romanTokensToParsedProgression(romanTokens);
	if (!parsed) return null;
	return romanTokens.join("-");
};

export function computeProgressionMatches(
	song: GroupedSong,
	coreProgressions: CoreProgression[]
): CoreProgressionWithStats[] {
	const totalChords = song.sections.reduce(
		(sum, section) => sum + section.parsedProgression.length,
		0
	);
	if (totalChords === 0) return [];

	return coreProgressions
		.map((progression): CoreProgressionWithStats | null => {
			const parsed = romanTokensToParsedProgression(
				progression.chordProgression.split("-")
			);
			if (!parsed) return null;

			const stats = computeStatsForParsedProgression(song, parsed);

			return {
				...progression,
				matchCount: stats.matchCount,
				coveragePercent: stats.coveragePercent
			};
		})
		.filter(
			(match): match is CoreProgressionWithStats =>
				match !== null && match.matchCount > 0
		)
		.sort((a, b) => b.coveragePercent - a.coveragePercent);
}

export function getSectionMatches(
	section: SongSection,
	chordProgression: string | null
): SubProgressionMatch[] {
	if (!chordProgression) return [];
	const parsed = romanTokensToParsedProgression(chordProgression.split("-"));
	if (!parsed) return [];
	return findSubProgressionMatches(section.parsedProgression, parsed);
}

export function buildChordHighlightSegments(
	section: SongSection,
	matches: SubProgressionMatch[]
): ChordHighlightSegment[] {
	const sectionLength = section.parsedProgression.length;
	const positionToMatchIndex = Array.from(
		{ length: sectionLength },
		(_, position) =>
			matches.findIndex((match) =>
				isPositionInMatch(position, match, sectionLength)
			)
	);
	const segments: ChordHighlightSegment[] = [];

	for (let position = 0; position < sectionLength; position++) {
		const matchIndex = positionToMatchIndex[position];
		const lastSegment = segments[segments.length - 1];
		if (lastSegment && lastSegment.matchIndex === matchIndex) {
			lastSegment.indices.push(position);
		} else {
			segments.push({ matchIndex, indices: [position] });
		}
	}

	return segments;
}
