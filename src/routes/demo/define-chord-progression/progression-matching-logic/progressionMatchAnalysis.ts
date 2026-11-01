import type { CoreProgression } from "$data/core-progressions.js";
import { chordProgressionVariants } from "$data/core-progressions.util.js";
import type { SongSection } from "../../../../data/songBrowser.js";
import type { ScaleName } from "../../../../chord-processing/scales.js";
import {
	romanTokenOffsetFromTonic,
	romanTokensToParsedProgression
} from "../../../../chord-processing/romanNumerals.js";
import type {
	ParsedProgressionChord,
	SubProgressionMatch
} from "../../../../chord-processing/types.js";
import { matchHighlightForCoreProgression } from "../components/progressionColors.js";
import {
	collapseAdjacentRepeatedChords,
	collapseMatchingTemplates,
	matchProgressionSelectiveExactness,
	templateShapeKey
} from "./collapsedProgression.js";

const MATCH_RATE_INTEGER_DISPLAY_THRESHOLD_PERCENT = 1;
const MATCH_RATE_LOW_PRECISION_DECIMAL_PLACES = 2;
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
	isStrictSubset?: boolean;
	highlightPalette: ChordHighlightPalette;
};

// Keyed on the selective matching shape: bare triads collapse to base quality,
// but specified extensions are preserved so I-Imaj7 ≠ I-vi.
export const abstractProgressionKey = (
	parsed: ParsedProgressionChord[]
): string => templateShapeKey(collapseMatchingTemplates(parsed));

export const scopedToScale = (key: string, scale: ScaleName): string =>
	`${scale}|${key}`;

export const progressionMatchListKey = (
	match: Pick<ProgressionWithMatchStats, "chordProgression" | "scale">
): string => scopedToScale(match.chordProgression, match.scale);

export type CoreLookupEntry = {
	name: string;
	firstChordRootPitchClass: number;
	parsed: ParsedProgressionChord[];
};

export const buildCoreLookupEntries = (
	coreProgressions: CoreProgression[]
): CoreLookupEntry[] =>
	coreProgressions.flatMap((progression) =>
		chordProgressionVariants(progression.chordProgression).flatMap(
			(variant): CoreLookupEntry[] => {
				const parsed = romanTokensToParsedProgression(
					variant.split("-"),
					progression.scale
				);
				if (!parsed || parsed.length === 0) return [];
				return [
					{
						name: progression.name,
						firstChordRootPitchClass: parsed[0].rootPitchClass,
						parsed
					}
				];
			}
		)
	);

const unitMatchesCore = (
	unit: ParsedProgressionChord[],
	parsedCore: ParsedProgressionChord[]
): boolean =>
	matchProgressionSelectiveExactness(unit, parsedCore).some(
		(match) => match.start === 0 && match.start + match.length === unit.length
	);

export const lookupCoreEntry = (
	entries: CoreLookupEntry[],
	unit: ParsedProgressionChord[],
	section: SongSection,
	startIndex: number
): CoreLookupEntry | undefined => {
	const eligible = entries.filter(
		(entry) =>
			unitMatchesCore(unit, entry.parsed) &&
			matchStartsOnExpectedTonic(
				section,
				startIndex,
				entry.firstChordRootPitchClass
			)
	);
	return eligible[eligible.length - 1];
};

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

const UNMATCHED_SONG_STATS = { matchCount: 0, coveragePercent: 0 };

const parsedCoreVariants = (progression: CoreProgression) =>
	chordProgressionVariants(progression.chordProgression).flatMap((variant) => {
		const parsed = romanTokensToParsedProgression(
			variant.split("-"),
			progression.scale
		);
		return parsed ? [{ chordProgression: variant, parsed }] : [];
	});

export const buildCoreProgressionDisplayMatches = (
	coreProgressions: CoreProgression[],
	songMatches: readonly ProgressionWithMatchStats[] | null,
	progressionMatchCounts: Record<string, number> | null
): ProgressionWithMatchStats[] =>
	coreProgressions.flatMap((progression): ProgressionWithMatchStats[] => {
		const variants = parsedCoreVariants(progression);
		if (variants.length === 0) return [];
		const songMatch = songMatches?.find(
			(match) => match.isCoreProgression && match.name === progression.name
		);
		const displayVariant =
			variants.find(
				(variant) => variant.chordProgression === songMatch?.chordProgression
			) ?? pickPrimaryVariant(variants, progressionMatchCounts);
		const stats = songMatch ?? UNMATCHED_SONG_STATS;
		return [
			{
				...progression,
				chordProgression: displayVariant.chordProgression,
				parsedProgression: displayVariant.parsed,
				matchCount: stats.matchCount,
				coveragePercent: stats.coveragePercent,
				...matchHighlightForCoreProgression(
					true,
					displayVariant.chordProgression,
					progression.name
				)
			}
		];
	});

export const tonicOffsetAt = (
	section: SongSection,
	index: number
): number | null => {
	const token = section.romanTokens[index];
	return token ? romanTokenOffsetFromTonic(token, section.scale) : null;
};

export const matchStartsOnExpectedTonic = (
	section: SongSection,
	matchStart: number,
	expectedTonicOffset: number | null
): boolean => {
	const offset = tonicOffsetAt(section, matchStart);
	return (
		offset === null ||
		expectedTonicOffset === null ||
		offset === expectedTonicOffset
	);
};

export const matchSectionProgressionExactly = (
	section: SongSection,
	searchProgression: ParsedProgressionChord[],
	searchTonicOffset: number | null,
	fromIndex = 0
): SubProgressionMatch[] =>
	matchProgressionSelectiveExactness(
		section.parsedProgression.slice(fromIndex),
		searchProgression
	)
		.map((match) => ({ ...match, start: match.start + fromIndex }))
		.filter((match) =>
			matchStartsOnExpectedTonic(section, match.start, searchTonicOffset)
		);

export const exactProgressionKey = (
	parsed: ParsedProgressionChord[],
	tonicOffset: number | null
): string => `${tonicOffset}|${abstractProgressionKey(parsed)}`;

const isPositionInMatch = (
	position: number,
	{ start, length }: SubProgressionMatch,
	sectionLength: number
): boolean =>
	Array.from(
		{ length },
		(_, offset) => (start + offset) % sectionLength
	).includes(position);

export type ChordAnnotation = {
	parsedProgression: ParsedProgressionChord[];
	palette: ChordHighlightPalette;
	isStrictSubset?: boolean;
	chordProgression?: string;
	highlightPositionsBySection: number[][];
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

const contiguousRunsFromPositions = (
	positions: number[]
): SubProgressionMatch[] =>
	[...new Set(positions)]
		.sort((a, b) => a - b)
		.reduce<SubProgressionMatch[]>((runs, position) => {
			const last = runs[runs.length - 1];
			if (last && position === last.start + last.length) {
				return [
					...runs.slice(0, -1),
					{ start: last.start, length: last.length + 1 }
				];
			}
			return [...runs, { start: position, length: 1 }];
		}, []);

const matchesFromClaimedPositions = (
	positions: number[],
	unitLength: number
): SubProgressionMatch[] => {
	const runs = contiguousRunsFromPositions(positions);
	if (unitLength <= 0) return runs;
	return runs.flatMap((run) => {
		const chunkCount = Math.ceil(run.length / unitLength);
		return Array.from({ length: chunkCount }, (_, chunkIndex) => {
			const start = run.start + chunkIndex * unitLength;
			const remaining = run.start + run.length - start;
			return {
				start,
				length: Math.min(unitLength, remaining)
			};
		});
	});
};

const collapsedIndexByOriginalPosition = (
	originalRanges: { start: number; length: number }[]
): number[] =>
	originalRanges.flatMap((range, collapsedIndex) =>
		Array.from({ length: range.length }, () => collapsedIndex)
	);

const collapsedPositionsFromOriginal = (
	originalPositions: number[],
	collapsedIndexByOriginal: number[]
): number[] =>
	[
		...new Set(
			originalPositions
				.filter(
					(position) =>
						position >= 0 && position < collapsedIndexByOriginal.length
				)
				.map((position) => collapsedIndexByOriginal[position])
		)
	].sort((a, b) => a - b);

const matchesForAnnotation = (
	sectionIndex: number,
	annotation: ChordAnnotation,
	collapsedIndexByOriginal: number[]
): SubProgressionMatch[] => {
	const originalPositions =
		annotation.highlightPositionsBySection[sectionIndex] ?? [];
	return matchesFromClaimedPositions(
		collapsedPositionsFromOriginal(originalPositions, collapsedIndexByOriginal),
		annotation.parsedProgression.length
	);
};

export const buildColoredHighlightSegments = (
	section: SongSection,
	sectionIndex: number,
	annotations: ChordAnnotation[]
): ColoredHighlightSegment[] => {
	const { originalRanges } = collapseAdjacentRepeatedChords(
		section.parsedProgression
	);
	const collapsedLength = originalRanges.length;
	const collapsedIndexByOriginal =
		collapsedIndexByOriginalPosition(originalRanges);

	const matchesByAnnotation = annotations.map((annotation) =>
		matchesForAnnotation(sectionIndex, annotation, collapsedIndexByOriginal)
	);

	const positionGroups: PositionGroup[] = Array.from(
		{ length: collapsedLength },
		(_, collapsedIndex) => {
			for (
				let annotationIndex = 0;
				annotationIndex < annotations.length;
				annotationIndex++
			) {
				const matchIndex = matchesByAnnotation[annotationIndex].findIndex(
					(match) => isPositionInMatch(collapsedIndex, match, collapsedLength)
				);
				if (matchIndex !== -1) return { annotationIndex, matchIndex };
			}
			return null;
		}
	);

	const segments: ColoredHighlightSegment[] = [];
	for (
		let collapsedIndex = 0;
		collapsedIndex < collapsedLength;
		collapsedIndex++
	) {
		const group = positionGroups[collapsedIndex];
		const prevGroup =
			collapsedIndex > 0 ? positionGroups[collapsedIndex - 1] : undefined;
		const displayIndex = originalRanges[collapsedIndex].start;

		if (prevGroup !== undefined && isContinuingGroup(prevGroup, group)) {
			segments[segments.length - 1].indices.push(displayIndex);
		} else {
			const annotation =
				group !== null ? annotations[group.annotationIndex] : null;
			segments.push({
				palette: annotation?.palette ?? null,
				isStrictSubset: annotation?.isStrictSubset ?? false,
				chordProgression: annotation?.chordProgression ?? null,
				indices: [displayIndex]
			});
		}
	}
	return segments;
};
