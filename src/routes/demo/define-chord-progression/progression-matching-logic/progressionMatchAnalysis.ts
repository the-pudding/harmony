import type { CoreProgression } from "$data/core-progressions.js";
import type { GroupedSong, SongSection } from "../../../../data/songBrowser.js";
import type { ScaleName } from "../../../../chord-processing/scales.js";
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
import {
	collapseAdjacentCanonical,
	collapsedMatchToOriginalMatch,
	toCanonicalMatchingChord
} from "./collapsedProgression.js";

export const MIN_PROGRESSION_OCCURRENCES = 2;

export const MATCH_RATE_INTEGER_DISPLAY_THRESHOLD_PERCENT = 1;
export const MATCH_RATE_LOW_PRECISION_DECIMAL_PLACES = 2;
const PERCENT_MULTIPLIER = 100;

export const formatMatchRatePercent = (percent: number): string => {
	if (percent >= MATCH_RATE_INTEGER_DISPLAY_THRESHOLD_PERCENT) {
		return String(Math.round(percent));
	}
	if (percent <= 0) {
		return "0";
	}
	return Number(
		percent.toFixed(MATCH_RATE_LOW_PRECISION_DECIMAL_PLACES)
	).toString();
};

export type ChordHighlightPalette = {
	fill: string;
	border: string;
};

export type ProgressionWithMatchStats = {
	name: string;
	chordProgression: string;
	parsedProgression: ParsedProgressionChord[];
	scale: ScaleName;
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

// Keyed on the canonical (extension- and bass-agnostic) shape so that a
// progression matches its core definition even when transcribed with 7ths, sus
// chords, or inversions.
export const abstractProgressionKey = (parsed: ParsedProgressionChord[]): string =>
	JSON.stringify(toAbstractProgression(parsed.map(toCanonicalMatchingChord)));

export const buildCoreNameByAbstractKey = (
	coreProgressions: CoreProgression[]
): Map<string, string> =>
	new Map(
		coreProgressions.flatMap((progression) => {
			const parsed = romanTokensToParsedProgression(
				progression.chordProgression.split("-"),
				progression.scale
			);
			if (!parsed) return [];
			return [[abstractProgressionKey(parsed), progression.name]] as const;
		})
	);

// Matching treats a run of repeated chords (identical once extensions and slash
// bass are ignored, e.g. I·Isus2 or V·Vsus4) as a single chord: both the section
// and the search progression are collapsed to their canonical shape before
// matching, then each match is mapped back onto the original chord positions.
const matchProgressionIgnoringBassAndExtensions = (
	sectionProgression: ParsedProgressionChord[],
	searchProgression: ParsedProgressionChord[]
): SubProgressionMatch[] => {
	const collapsedSection = collapseAdjacentCanonical(sectionProgression);
	const collapsedSearch = collapseAdjacentCanonical(searchProgression);
	return findSubProgressionMatches(
		collapsedSection.chords,
		collapsedSearch.chords
	).map((match) =>
		collapsedMatchToOriginalMatch(match, collapsedSection.originalRanges)
	);
};

const toNonOverlappingMatches = (
	matches: SubProgressionMatch[],
	sectionLength: number
): SubProgressionMatch[] => {
	const covered = new Set<number>();
	return matches.filter(({ start, length }) => {
		const positions = Array.from(
			{ length },
			(_, i) => (start + i) % sectionLength
		);
		if (positions.some((p) => covered.has(p))) return false;
		positions.forEach((p) => covered.add(p));
		return true;
	});
};

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
			const matches = getSectionMatches(section, parsed);
			return {
				matchCount: accumulator.matchCount + matches.length,
				coveredPositions:
					accumulator.coveredPositions +
					matches.reduce((sum, m) => sum + m.length, 0)
			};
		},
		{ matchCount: 0, coveredPositions: 0 }
	);

	return {
		matchCount: stats.matchCount,
		coveragePercent: (stats.coveredPositions / totalChords) * 100
	};
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
				progression.chordProgression.split("-"),
				progression.scale
			);
			if (!parsed) return null;

			const stats = computeStatsForParsedProgression(song, parsed);

			return {
				...progression,
				parsedProgression: parsed,
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

export type ParsedCoreProgression = {
	chordProgression: string;
	parsed: ParsedProgressionChord[];
};

export const parseCoreProgressions = (
	coreProgressions: CoreProgression[]
): ParsedCoreProgression[] =>
	coreProgressions
		.filter(
			(progression) => !isSelfRepeatingProgression(progression.chordProgression)
		)
		.flatMap((progression) => {
			const parsed = romanTokensToParsedProgression(
				progression.chordProgression.split("-"),
				progression.scale
			);
			if (!parsed) return [];
			return [{ chordProgression: progression.chordProgression, parsed }];
		});

export const findMatchingCoreProgressionsForSong = (
	song: GroupedSong,
	parsedCoreProgressions: ParsedCoreProgression[]
): string[] =>
	parsedCoreProgressions
		.filter(({ parsed }) => {
			const { matchCount } = computeStatsForParsedProgression(song, parsed);
			return matchCount >= MIN_PROGRESSION_OCCURRENCES;
		})
		.map(({ chordProgression }) => chordProgression);

export const buildProgressionMatchRates = (
	matchingLists: string[][],
	totalSongs: number
): {
	progressionMatchRates: Record<string, number>;
	progressionMatchCounts: Record<string, number>;
} => {
	if (totalSongs === 0) {
		return { progressionMatchRates: {}, progressionMatchCounts: {} };
	}
	const counts: Record<string, number> = {};
	for (const list of matchingLists) {
		for (const chordProgression of list) {
			counts[chordProgression] = (counts[chordProgression] ?? 0) + 1;
		}
	}
	const progressionMatchRates: Record<string, number> = {};
	const progressionMatchCounts: Record<string, number> = {};
	for (const [chordProgression, count] of Object.entries(counts)) {
		progressionMatchRates[chordProgression] =
			(count / totalSongs) * PERCENT_MULTIPLIER;
		progressionMatchCounts[chordProgression] = count;
	}
	return { progressionMatchRates, progressionMatchCounts };
};

export const buildCoreProgressionDisplayMatches = (
	coreProgressions: CoreProgression[],
	song: GroupedSong | null
): ProgressionWithMatchStats[] =>
	coreProgressions
		.filter(
			(progression) => !isSelfRepeatingProgression(progression.chordProgression)
		)
		.map((progression): ProgressionWithMatchStats | null => {
			const parsed = romanTokensToParsedProgression(
				progression.chordProgression.split("-"),
				progression.scale
			);
			if (!parsed) return null;

			const stats = song
				? computeStatsForParsedProgression(song, parsed)
				: { matchCount: 0, coveragePercent: 0 };

			return {
				...progression,
				parsedProgression: parsed,
				matchCount: stats.matchCount,
				coveragePercent: stats.coveragePercent,
				...matchHighlightForCoreProgression(true)
			};
		})
		.filter((match): match is ProgressionWithMatchStats => match !== null);

export function getSectionMatches(
	section: SongSection,
	searchProgression: ParsedProgressionChord[] | null
): SubProgressionMatch[] {
	if (!searchProgression || searchProgression.length === 0) return [];
	const sectionLength = section.parsedProgression.length;
	return toNonOverlappingMatches(
		matchProgressionIgnoringBassAndExtensions(
			section.parsedProgression,
			searchProgression
		),
		sectionLength
	);
}

export const computeCoveredPositionsBySection = (
	song: GroupedSong,
	searchProgression: ParsedProgressionChord[]
): number[][] =>
	song.sections.map((section) => {
		const sectionLength = section.parsedProgression.length;
		const matches = getSectionMatches(section, searchProgression);
		return positionsFromMatches(matches, sectionLength);
	});

export const matchPositions = (
	match: SubProgressionMatch,
	sectionLength: number
): number[] =>
	Array.from(
		{ length: match.length },
		(_, index) => (match.start + index) % sectionLength
	);

export const isMatchFullyOutsideCoverage = (
	match: SubProgressionMatch,
	occupied: Set<number>,
	sectionLength: number
): boolean =>
	matchPositions(match, sectionLength).every(
		(position) => !occupied.has(position)
	);

export const getGapOnlySectionMatches = (
	section: SongSection,
	searchProgression: ParsedProgressionChord[],
	occupiedPositions: number[]
): SubProgressionMatch[] => {
	const occupied = new Set(occupiedPositions);
	const sectionLength = section.parsedProgression.length;
	return getSectionMatches(section, searchProgression).filter((match) =>
		isMatchFullyOutsideCoverage(match, occupied, sectionLength)
	);
};

export const positionsFromMatches = (
	matches: SubProgressionMatch[],
	sectionLength: number
): number[] => {
	const positions = new Set<number>();
	for (const match of matches) {
		matchPositions(match, sectionLength).forEach((position) =>
			positions.add(position)
		);
	}
	return [...positions].sort((a, b) => a - b);
};

export const computeGapOnlyCoveredPositionsBySection = (
	song: GroupedSong,
	searchProgression: ParsedProgressionChord[],
	occupiedCoverage: number[][]
): number[][] =>
	song.sections.map((section, sectionIndex) =>
		positionsFromMatches(
			getGapOnlySectionMatches(
				section,
				searchProgression,
				occupiedCoverage[sectionIndex] ?? []
			),
			section.parsedProgression.length
		)
	);

export const computeGapOnlyStats = (
	song: GroupedSong,
	parsed: ParsedProgressionChord[],
	occupiedCoverage: number[][]
): { matchCount: number; coveragePercent: number } => {
	const totalChords = song.sections.reduce(
		(sum, section) => sum + section.parsedProgression.length,
		0
	);
	if (totalChords === 0) return { matchCount: 0, coveragePercent: 0 };

	const stats = song.sections.reduce(
		(accumulator, section, sectionIndex) => {
			const matches = getGapOnlySectionMatches(
				section,
				parsed,
				occupiedCoverage[sectionIndex] ?? []
			);
			return {
				matchCount: accumulator.matchCount + matches.length,
				coveredPositions:
					accumulator.coveredPositions +
					matches.reduce((sum, match) => sum + match.length, 0)
			};
		},
		{ matchCount: 0, coveredPositions: 0 }
	);

	return {
		matchCount: stats.matchCount,
		coveragePercent: (stats.coveredPositions / totalChords) * 100
	};
};

export type ChordAnnotation = {
	parsedProgression: ParsedProgressionChord[];
	palette: ChordHighlightPalette;
	isStrictSubset?: boolean;
	chordProgression?: string;
	highlightPositionsBySection?: number[][];
};

export type ColoredHighlightSegment = {
	palette: ChordHighlightPalette | null;
	isStrictSubset: boolean;
	chordProgression: string | null;
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
	sectionIndex: number,
	annotations: ChordAnnotation[]
): ColoredHighlightSegment[] => {
	const sectionLength = section.parsedProgression.length;

	const matchesByAnnotation = annotations.map(
		({ parsedProgression, highlightPositionsBySection }) => {
			const allMatches = getSectionMatches(section, parsedProgression);
			const allowedPositions = highlightPositionsBySection?.[sectionIndex];
			if (allowedPositions === undefined) return allMatches;
			const allowed = new Set(allowedPositions);
			return allMatches.filter((match) =>
				matchPositions(match, sectionLength).every((position) =>
					allowed.has(position)
				)
			);
		}
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
				chordProgression: annotation?.chordProgression ?? null,
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
