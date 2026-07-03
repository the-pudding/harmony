import type { CoreProgression } from "$data/core-progressions.js";
import type {
	GroupedSong,
	SongSection
} from "../../progressions/songBrowser.js";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";
import {
	findSubProgressionMatches,
	isPositionInMatch,
	toAbstractProgression
} from "../../../../chord-processing/match-chord-progressions/index.js";
import type {
	ParsedProgressionChord,
	SubProgressionMatch
} from "../../../../chord-processing/types.js";
import { matchHighlightForCoreProgression } from "../components/progressionColors.js";
import { isSelfRepeatingProgression } from "./progressionConstraints.js";

export const MIN_PROGRESSION_OCCURRENCES = 2;

export type ChordHighlightPalette = {
	fill: string;
	border: string;
};

export type ProgressionWithMatchStats = {
	name: string;
	chordProgression: string;
	description: string;
	matchCount: number;
	coveragePercent: number;
	isCoreProgression: boolean;
	isStrictSubset?: boolean;
	highlightPalette: ChordHighlightPalette;
};

export type CoreProgressionWithStats = ProgressionWithMatchStats;

export type ChordHighlightSegment = {
	matchIndex: number;
	indices: number[];
};

export const abstractProgressionKey = (
	parsed: ParsedProgressionChord[]
): string => JSON.stringify(toAbstractProgression(parsed));

// Slash chords are matched purely on the chord itself; the bass note is ignored.
const withoutSlashBass = (
	chords: ParsedProgressionChord[]
): ParsedProgressionChord[] =>
	chords.map(
		({ bassPitchClass: _bass, ...chord }) => chord as ParsedProgressionChord
	);

const matchProgressionIgnoringBass = (
	sectionProgression: ParsedProgressionChord[],
	searchProgression: ParsedProgressionChord[]
): SubProgressionMatch[] =>
	findSubProgressionMatches(
		withoutSlashBass(sectionProgression),
		withoutSlashBass(searchProgression)
	);

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
			const matches = matchProgressionIgnoringBass(
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
		.filter(
			(progression) => !isSelfRepeatingProgression(progression.chordProgression)
		)
		.map((progression): CoreProgressionWithStats | null => {
			const parsed = romanTokensToParsedProgression(
				progression.chordProgression.split("-")
			);
			if (!parsed) return null;

			const stats = computeStatsForParsedProgression(song, parsed);

			return {
				...progression,
				matchCount: stats.matchCount,
				coveragePercent: stats.coveragePercent,
				...matchHighlightForCoreProgression(true)
			};
		})
		.filter(
			(match): match is CoreProgressionWithStats =>
				match !== null && match.matchCount >= MIN_PROGRESSION_OCCURRENCES
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
	return matchProgressionIgnoringBass(section.parsedProgression, parsed);
}

export const computeCoveredPositionsBySection = (
	song: GroupedSong,
	chordProgression: string
): number[][] =>
	song.sections.map((section) => {
		const matches = getSectionMatches(section, chordProgression);
		const sectionLength = section.parsedProgression.length;
		return Array.from({ length: sectionLength }, (_, pos) => pos).filter(
			(pos) =>
				matches.some((match) => isPositionInMatch(pos, match, sectionLength))
		);
	});

export type ChordAnnotation = {
	chordProgression: string;
	palette: ChordHighlightPalette;
	isStrictSubset?: boolean;
};

export type ColoredHighlightSegment = {
	palette: ChordHighlightPalette | null;
	isStrictSubset: boolean;
	indices: number[];
};

type PositionGroup = { annotationIndex: number; matchIndex: number } | null;

const isContinuingGroup = (prev: PositionGroup, curr: PositionGroup): boolean =>
	(prev === null && curr === null) ||
	(prev !== null &&
		curr !== null &&
		prev.annotationIndex === curr.annotationIndex &&
		prev.matchIndex === curr.matchIndex);

export const buildColoredHighlightSegments = (
	section: SongSection,
	annotations: ChordAnnotation[]
): ColoredHighlightSegment[] => {
	const sectionLength = section.parsedProgression.length;

	const matchesByAnnotation = annotations.map(({ chordProgression }) =>
		getSectionMatches(section, chordProgression)
	);

	const positionGroups: PositionGroup[] = Array.from(
		{ length: sectionLength },
		(_, position) => {
			for (
				let annotationIndex = 0;
				annotationIndex < annotations.length;
				annotationIndex++
			) {
				const matchIndex = matchesByAnnotation[annotationIndex].findIndex(
					(match) => isPositionInMatch(position, match, sectionLength)
				);
				if (matchIndex !== -1) return { annotationIndex, matchIndex };
			}
			return null;
		}
	);

	const segments: ColoredHighlightSegment[] = [];
	for (let position = 0; position < sectionLength; position++) {
		const group = positionGroups[position];
		const prevGroup = position > 0 ? positionGroups[position - 1] : undefined;

		if (prevGroup !== undefined && isContinuingGroup(prevGroup, group)) {
			segments[segments.length - 1].indices.push(position);
		} else {
			const annotation =
				group !== null ? annotations[group.annotationIndex] : null;
			segments.push({
				palette: annotation?.palette ?? null,
				isStrictSubset: annotation?.isStrictSubset ?? false,
				indices: [position]
			});
		}
	}
	return segments;
};

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
