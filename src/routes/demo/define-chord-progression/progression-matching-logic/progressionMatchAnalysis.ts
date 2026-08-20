import type { CoreProgression } from "$data/core-progressions.js";
import { chordProgressionVariants } from "$data/core-progressions.util.js";
import {
	isChorusSectionLabel,
	type GroupedSong,
	type SongSection
} from "../../../../data/songBrowser.js";
import type { ScaleName } from "../../../../chord-processing/scales.js";
import {
	romanTokenOffsetFromTonic,
	romanTokensToParsedProgression
} from "../../../../chord-processing/romanNumerals.js";
import {
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
	collapseMatchingTemplates,
	matchProgressionSelectiveExactness
} from "./collapsedProgression.js";

export const MIN_PROGRESSION_OCCURRENCES = 2;
export const MIN_FULL_SECTION_OCCURRENCES = 1;

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
	chorusMatchCount?: number;
	coveragePercent: number;
	isCoreProgression: boolean;
	matchRomanNumeralsExactly?: boolean;
	isStrictSubset?: boolean;
	isFullSectionSingleMatch?: boolean;
	isSectionStartBiasWinner?: boolean;
	sectionStartBiasSacrificedPercent?: number;
	highlightPalette: ChordHighlightPalette;
};

export type CoreProgressionWithStats = ProgressionWithMatchStats;

export type ChordHighlightSegment = {
	matchIndex: number;
	indices: number[];
};

// Keyed on the selective matching shape: bare triads collapse to base quality,
// but specified extensions / slash bass are preserved so I-Imaj7 ≠ I-vi.
export const abstractProgressionKey = (
	parsed: ParsedProgressionChord[]
): string =>
	JSON.stringify(
		toAbstractProgression(
			collapseMatchingTemplates(parsed).map(({ chord }) => chord)
		)
	);

export const buildCoreNameByAbstractKey = (
	coreProgressions: CoreProgression[]
): Map<string, string> =>
	new Map(
		coreProgressions.flatMap((progression) =>
			chordProgressionVariants(progression.chordProgression).flatMap(
				(variant) => {
					const parsed = romanTokensToParsedProgression(
						variant.split("-"),
						progression.scale
					);
					if (!parsed) return [];
					return [[abstractProgressionKey(parsed), progression.name]] as const;
				}
			)
		)
	);

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
	parsed: ParsedProgressionChord[],
	matchRomanNumeralsExactly = false
): { matchCount: number; chorusMatchCount: number; coveragePercent: number } => {
	const totalChords = song.sections.reduce(
		(sum, section) => sum + section.parsedProgression.length,
		0
	);
	if (totalChords === 0) {
		return { matchCount: 0, chorusMatchCount: 0, coveragePercent: 0 };
	}

	const stats = song.sections.reduce(
		(accumulator, section) => {
			const matches = getSectionMatches(
				section,
				parsed,
				matchRomanNumeralsExactly
			);
			return {
				matchCount: accumulator.matchCount + matches.length,
				chorusMatchCount:
					accumulator.chorusMatchCount +
					(isChorusSectionLabel(section.label) ? matches.length : 0),
				coveredPositions:
					accumulator.coveredPositions +
					matches.reduce((sum, m) => sum + m.length, 0)
			};
		},
		{ matchCount: 0, chorusMatchCount: 0, coveredPositions: 0 }
	);

	return {
		matchCount: stats.matchCount,
		chorusMatchCount: stats.chorusMatchCount,
		coveragePercent: (stats.coveredPositions / totalChords) * 100
	};
};

export const fullyCoversAnySection = (
	song: GroupedSong,
	parsed: ParsedProgressionChord[],
	matchRomanNumeralsExactly = false
): boolean =>
	song.sections.some((section) => {
		const sectionLength = section.parsedProgression.length;
		if (sectionLength === 0) return false;
		const covered = positionsFromMatches(
			getSectionMatches(section, parsed, matchRomanNumeralsExactly),
			sectionLength
		);
		return covered.length === sectionLength;
	});

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
		.flatMap((progression) =>
			chordProgressionVariants(progression.chordProgression).map(
				(variant): CoreProgressionWithStats | null => {
					if (isSelfRepeatingProgression(variant)) return null;
					const parsed = romanTokensToParsedProgression(
						variant.split("-"),
						progression.scale
					);
					if (!parsed) return null;

				const exact = progression.matchRomanNumeralsExactly ?? false;
				const stats = computeStatsForParsedProgression(song, parsed, exact);
				const coversFullSection = fullyCoversAnySection(song, parsed, exact);

					return {
						...progression,
						chordProgression: variant,
						parsedProgression: parsed,
						matchCount: stats.matchCount,
						chorusMatchCount: stats.chorusMatchCount,
						coveragePercent: stats.coveragePercent,
						isFullSectionSingleMatch:
							stats.matchCount < MIN_PROGRESSION_OCCURRENCES &&
							coversFullSection,
						...matchHighlightForCoreProgression(true, variant, progression.name)
					};
				}
			)
		)
		.filter(
			(match): match is CoreProgressionWithStats =>
				match !== null &&
				(match.matchCount >= MIN_PROGRESSION_OCCURRENCES ||
					(match.matchCount >= MIN_FULL_SECTION_OCCURRENCES &&
						match.isFullSectionSingleMatch === true))
		)
		.sort((a, b) => b.coveragePercent - a.coveragePercent);
}

export type ParsedCoreProgression = {
	chordProgression: string;
	parsed: ParsedProgressionChord[];
	matchRomanNumeralsExactly: boolean;
};

export const parseCoreProgressions = (
	coreProgressions: CoreProgression[]
): ParsedCoreProgression[] =>
	coreProgressions.flatMap((progression) =>
		chordProgressionVariants(progression.chordProgression).flatMap(
			(variant) => {
				if (isSelfRepeatingProgression(variant)) return [];
				const parsed = romanTokensToParsedProgression(
					variant.split("-"),
					progression.scale
				);
				if (!parsed) return [];
				return [
					{
						chordProgression: variant,
						parsed,
						matchRomanNumeralsExactly:
							progression.matchRomanNumeralsExactly ?? false
					}
				];
			}
		)
	);

export const findMatchingCoreProgressionsForSong = (
	song: GroupedSong,
	parsedCoreProgressions: ParsedCoreProgression[]
): string[] =>
	parsedCoreProgressions
		.filter(({ parsed, matchRomanNumeralsExactly }) => {
			const { matchCount } = computeStatsForParsedProgression(
				song,
				parsed,
				matchRomanNumeralsExactly
			);
			return (
				matchCount >= MIN_PROGRESSION_OCCURRENCES ||
				(matchCount >= MIN_FULL_SECTION_OCCURRENCES &&
					fullyCoversAnySection(song, parsed, matchRomanNumeralsExactly))
			);
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

export type SongProgressionMatchList = {
	matchingProgressions: string[];
};

// Union stats across sibling variants of one named core progression: a song
// counts once if any variant was selected. Adding a rarer exact-extension
// variant must never reduce the displayed match count.
export const aggregateVariantMatchStats = (
	variants: readonly string[],
	songCoverages: readonly SongProgressionMatchList[] | null,
	totalSongs: number
): { matchRatePercent: number; matchingSongCount: number } => {
	if (!songCoverages || totalSongs === 0 || variants.length === 0) {
		return { matchRatePercent: 0, matchingSongCount: 0 };
	}
	const variantSet = new Set(variants);
	const matchingSongCount = songCoverages.filter((song) =>
		song.matchingProgressions.some((progression) => variantSet.has(progression))
	).length;
	return {
		matchingSongCount,
		matchRatePercent: (matchingSongCount / totalSongs) * PERCENT_MULTIPLIER
	};
};

export const pickPrimaryVariant = <T extends { chordProgression: string }>(
	variants: readonly T[],
	progressionMatchCounts: Record<string, number> | null
): T => {
	const [first, ...rest] = variants;
	return rest.reduce(
		(best, candidate) =>
			(progressionMatchCounts?.[candidate.chordProgression] ?? 0) >
			(progressionMatchCounts?.[best.chordProgression] ?? 0)
				? candidate
				: best,
		first
	);
};

export const collapseDisplayMatchesByName = (
	matches: ProgressionWithMatchStats[],
	progressionMatchCounts: Record<string, number> | null
): ProgressionWithMatchStats[] => {
	const variantsByName = matches.reduce<
		Record<string, ProgressionWithMatchStats[]>
	>(
		(acc, match) => ({
			...acc,
			[match.name]: [...(acc[match.name] ?? []), match]
		}),
		{}
	);
	return Object.values(variantsByName).map((variants) =>
		pickPrimaryVariant(variants, progressionMatchCounts)
	);
};

export const buildCoreProgressionDisplayMatches = (
	coreProgressions: CoreProgression[],
	song: GroupedSong | null
): ProgressionWithMatchStats[] =>
	coreProgressions
		.flatMap((progression) =>
			chordProgressionVariants(progression.chordProgression).map(
				(variant): ProgressionWithMatchStats | null => {
					if (isSelfRepeatingProgression(variant)) return null;
					const parsed = romanTokensToParsedProgression(
						variant.split("-"),
						progression.scale
					);
					if (!parsed) return null;

				const exact = progression.matchRomanNumeralsExactly ?? false;
				const stats = song
					? computeStatsForParsedProgression(song, parsed, exact)
					: { matchCount: 0, coveragePercent: 0 };

					return {
						...progression,
						chordProgression: variant,
						parsedProgression: parsed,
						matchCount: stats.matchCount,
						coveragePercent: stats.coveragePercent,
						...matchHighlightForCoreProgression(true, variant, progression.name)
					};
				}
			)
		)
		.filter((match): match is ProgressionWithMatchStats => match !== null);

const matchStartsOnExpectedTonic = (
	section: SongSection,
	matchStart: number,
	expectedTonicOffset: number
): boolean => {
	const token = section.romanTokens[matchStart];
	if (!token) return true;
	const offset = romanTokenOffsetFromTonic(token, section.scale);
	if (offset === null) return true;
	return offset === expectedTonicOffset;
};

export function getSectionMatches(
	section: SongSection,
	searchProgression: ParsedProgressionChord[] | null,
	matchRomanNumeralsExactly = false
): SubProgressionMatch[] {
	if (!searchProgression || searchProgression.length === 0) return [];
	const sectionLength = section.parsedProgression.length;
	const rawMatches = matchProgressionSelectiveExactness(
		section.parsedProgression,
		searchProgression
	);
	const filteredMatches =
		matchRomanNumeralsExactly && searchProgression.length > 0
			? rawMatches.filter((match) =>
					matchStartsOnExpectedTonic(
						section,
						match.start,
						searchProgression[0].rootPitchClass
					)
				)
			: rawMatches;
	return toNonOverlappingMatches(filteredMatches, sectionLength);
}

export const computeCoveredPositionsBySection = (
	song: GroupedSong,
	searchProgression: ParsedProgressionChord[],
	matchRomanNumeralsExactly = false
): number[][] =>
	song.sections.map((section) => {
		const sectionLength = section.parsedProgression.length;
		const matches = getSectionMatches(
			section,
			searchProgression,
			matchRomanNumeralsExactly
		);
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
): { matchCount: number; chorusMatchCount: number; coveragePercent: number } => {
	const totalChords = song.sections.reduce(
		(sum, section) => sum + section.parsedProgression.length,
		0
	);
	if (totalChords === 0) {
		return { matchCount: 0, chorusMatchCount: 0, coveragePercent: 0 };
	}

	const stats = song.sections.reduce(
		(accumulator, section, sectionIndex) => {
			const matches = getGapOnlySectionMatches(
				section,
				parsed,
				occupiedCoverage[sectionIndex] ?? []
			);
			return {
				matchCount: accumulator.matchCount + matches.length,
				chorusMatchCount:
					accumulator.chorusMatchCount +
					(isChorusSectionLabel(section.label) ? matches.length : 0),
				coveredPositions:
					accumulator.coveredPositions +
					matches.reduce((sum, match) => sum + match.length, 0)
			};
		},
		{ matchCount: 0, chorusMatchCount: 0, coveredPositions: 0 }
	);

	return {
		matchCount: stats.matchCount,
		chorusMatchCount: stats.chorusMatchCount,
		coveragePercent: (stats.coveredPositions / totalChords) * 100
	};
};

export type ChordAnnotation = {
	parsedProgression: ParsedProgressionChord[];
	palette: ChordHighlightPalette;
	isStrictSubset?: boolean;
	chordProgression?: string;
	highlightPositionsBySection?: number[][];
	matchRomanNumeralsExactly?: boolean;
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
		({
			parsedProgression,
			highlightPositionsBySection,
			matchRomanNumeralsExactly
		}) => {
			const allMatches = getSectionMatches(
				section,
				parsedProgression,
				matchRomanNumeralsExactly ?? false
			);
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
