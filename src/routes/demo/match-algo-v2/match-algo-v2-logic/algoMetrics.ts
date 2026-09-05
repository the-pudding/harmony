import type { GroupedSong, SongSection } from "../../../../data/songBrowser.js";
import type {
	ChordAnnotation,
	ProgressionWithMatchStats
} from "../../define-chord-progression/progression-matching-logic/progressionMatchAnalysis.js";
import type { AlgoMatchResult } from "./matchResultCache.js";

export const PERCENT_MULTIPLIER = 100;
export const PROGRESSION_TOKEN_SEPARATOR = "-";
export const UNIT_LENGTH_3 = 3;
export const UNIT_LENGTH_4 = 4;
export const FIRST_SECTION_POSITION = 0;

export type SongAlgoMetrics = {
	songKey: string;
	title: string;
	artists: string[];
	totalChords: number;
	coveredChords: number;
	coveragePercent: number;
	coreCoveredChords: number;
	gapCoveredChords: number;
	coreCoveragePercent: number;
	gapCoveragePercent: number;
	sectionCount: number;
	sectionsStartingCovered: number;
	sectionStartRate: number;
	interiorSingletonCount: number;
	interiorUncoveredRunCount: number;
	coveredByLength3: number;
	coveredByLength4Plus: number;
	meanUnitLength: number;
	openingPrefixAlignedSections: number;
	openingPrefixAlignRate: number;
};

type PositionRun = {
	start: number;
	length: number;
};

const songChordCount = (song: GroupedSong): number =>
	song.sections.reduce(
		(sum, section) => sum + section.parsedProgression.length,
		0
	);

const percentOf = (part: number, whole: number): number =>
	whole > 0 ? (part / whole) * PERCENT_MULTIPLIER : 0;

const unitLengthOf = (chordProgression: string | undefined): number =>
	chordProgression
		? chordProgression.split(PROGRESSION_TOKEN_SEPARATOR).length
		: 0;

const claimedPositionsInSection = (
	annotations: ChordAnnotation[],
	sectionIndex: number
): Set<number> =>
	new Set(
		annotations.flatMap(
			(annotation) =>
				annotation.highlightPositionsBySection?.[sectionIndex] ?? []
		)
	);

const contiguousRunsFromPositions = (positions: number[]): PositionRun[] =>
	[...new Set(positions)]
		.sort((a, b) => a - b)
		.reduce<PositionRun[]>((runs, position) => {
			const last = runs[runs.length - 1];
			if (last && position === last.start + last.length) {
				return [
					...runs.slice(0, -1),
					{ start: last.start, length: last.length + 1 }
				];
			}
			return [...runs, { start: position, length: 1 }];
		}, []);

const NEIGHBOR_OFFSET = 1;

const isInteriorRun = (run: PositionRun, sectionLength: number): boolean =>
	run.start > FIRST_SECTION_POSITION &&
	run.start + run.length < sectionLength;

const claimedAt = (
	claimedBySection: Set<number>[],
	sectionIndex: number,
	position: number
): boolean => claimedBySection[sectionIndex]?.has(position) ?? false;

const hasCoveredLeftNeighbor = (
	claimedBySection: Set<number>[],
	sectionIndex: number,
	position: number,
	sectionLengths: number[]
): boolean => {
	if (position > FIRST_SECTION_POSITION) {
		return claimedAt(
			claimedBySection,
			sectionIndex,
			position - NEIGHBOR_OFFSET
		);
	}
	const previousSectionIndex = sectionIndex - NEIGHBOR_OFFSET;
	const previousLength = sectionLengths[previousSectionIndex];
	if (previousLength === undefined || previousLength === 0) return false;
	return claimedAt(
		claimedBySection,
		previousSectionIndex,
		previousLength - NEIGHBOR_OFFSET
	);
};

const hasCoveredRightNeighbor = (
	claimedBySection: Set<number>[],
	sectionIndex: number,
	position: number,
	sectionLengths: number[]
): boolean => {
	const sectionLength = sectionLengths[sectionIndex] ?? 0;
	if (position < sectionLength - NEIGHBOR_OFFSET) {
		return claimedAt(
			claimedBySection,
			sectionIndex,
			position + NEIGHBOR_OFFSET
		);
	}
	return claimedAt(
		claimedBySection,
		sectionIndex + NEIGHBOR_OFFSET,
		FIRST_SECTION_POSITION
	);
};

const coveringProgressionAt = (
	annotations: ChordAnnotation[],
	sectionIndex: number,
	position: number
): string | undefined =>
	annotations.find((annotation) =>
		annotationCoversPosition(annotation, sectionIndex, position)
	)?.chordProgression;

const unitTokensOf = (chordProgression: string | undefined): string[] =>
	chordProgression
		? chordProgression.split(PROGRESSION_TOKEN_SEPARATOR)
		: [];

const isExactUnitPrefix = (
	leftoverTokens: string[],
	chordProgression: string | undefined
): boolean => {
	const unitTokens = unitTokensOf(chordProgression);
	if (
		leftoverTokens.length === 0 ||
		unitTokens.length === 0 ||
		leftoverTokens.length >= unitTokens.length
	) {
		return false;
	}
	return leftoverTokens.every((token, index) => token === unitTokens[index]);
};

const leftNeighborLocation = (
	sectionIndex: number,
	position: number,
	sectionLengths: number[]
): { sectionIndex: number; position: number } | null => {
	if (position > FIRST_SECTION_POSITION) {
		return { sectionIndex, position: position - NEIGHBOR_OFFSET };
	}
	const previousSectionIndex = sectionIndex - NEIGHBOR_OFFSET;
	const previousLength = sectionLengths[previousSectionIndex];
	if (previousLength === undefined || previousLength === 0) return null;
	return {
		sectionIndex: previousSectionIndex,
		position: previousLength - NEIGHBOR_OFFSET
	};
};

const openingCoveringProgression = (
	annotations: ChordAnnotation[],
	sectionIndex: number
): string | undefined =>
	coveringProgressionAt(annotations, sectionIndex, FIRST_SECTION_POSITION);

const isExpectedPrefixLeftover = (
	leftoverToken: string | undefined,
	sectionIndex: number,
	position: number,
	sectionLengths: number[],
	annotations: ChordAnnotation[]
): boolean => {
	if (leftoverToken === undefined) return false;
	const leftoverTokens = [leftoverToken];
	const left = leftNeighborLocation(sectionIndex, position, sectionLengths);
	const leftUnit = left
		? coveringProgressionAt(annotations, left.sectionIndex, left.position)
		: undefined;
	const openingUnit = openingCoveringProgression(annotations, sectionIndex);
	return (
		isExactUnitPrefix(leftoverTokens, leftUnit) ||
		isExactUnitPrefix(leftoverTokens, openingUnit)
	);
};

const isInteriorSingleton = (
	sectionIndex: number,
	position: number,
	section: SongSection,
	claimedBySection: Set<number>[],
	sectionLengths: number[],
	annotations: ChordAnnotation[]
): boolean =>
	!claimedAt(claimedBySection, sectionIndex, position) &&
	hasCoveredLeftNeighbor(
		claimedBySection,
		sectionIndex,
		position,
		sectionLengths
	) &&
	hasCoveredRightNeighbor(
		claimedBySection,
		sectionIndex,
		position,
		sectionLengths
	) &&
	!isExpectedPrefixLeftover(
		section.romanTokens[position],
		sectionIndex,
		position,
		sectionLengths,
		annotations
	);

const coreProgressionKeys = (
	matches: ProgressionWithMatchStats[]
): Set<string> =>
	new Set(
		matches
			.filter((match) => match.isCoreProgression)
			.map((match) => match.chordProgression)
	);

const annotationCoversPosition = (
	annotation: ChordAnnotation,
	sectionIndex: number,
	position: number
): boolean =>
	(annotation.highlightPositionsBySection?.[sectionIndex] ?? []).includes(
		position
	);

const openingUnitMatchesPrefix = (
	section: SongSection,
	sectionIndex: number,
	annotations: ChordAnnotation[]
): boolean => {
	const covering = annotations.find((annotation) =>
		annotationCoversPosition(annotation, sectionIndex, FIRST_SECTION_POSITION)
	);
	if (!covering?.chordProgression) return false;
	const unitLength = unitLengthOf(covering.chordProgression);
	if (unitLength === 0 || section.romanTokens.length < unitLength) return false;
	const prefix = section.romanTokens
		.slice(FIRST_SECTION_POSITION, unitLength)
		.join(PROGRESSION_TOKEN_SEPARATOR);
	return prefix === covering.chordProgression;
};

export const computeSongAlgoMetrics = (
	song: GroupedSong,
	result: AlgoMatchResult
): SongAlgoMetrics => {
	const totalChords = songChordCount(song);
	const coreKeys = coreProgressionKeys(result.matches);
	const sectionCount = song.sections.length;

	const claimedBySection = song.sections.map((_, sectionIndex) =>
		claimedPositionsInSection(result.annotations, sectionIndex)
	);
	const sectionLengths = song.sections.map(
		(section) => section.parsedProgression.length
	);

	const perSection = song.sections.map((section, sectionIndex) => {
		const claimed = claimedBySection[sectionIndex] ?? new Set<number>();
		const sectionLength = sectionLengths[sectionIndex] ?? 0;
		const uncovered = Array.from(
			{ length: sectionLength },
			(_, position) => position
		).filter((position) => !claimed.has(position));
		const uncoveredRuns = contiguousRunsFromPositions(uncovered);

		const coreCovered = [...claimed].filter((position) =>
			result.annotations.some(
				(annotation) =>
					annotation.chordProgression !== undefined &&
					coreKeys.has(annotation.chordProgression) &&
					annotationCoversPosition(annotation, sectionIndex, position)
			)
		).length;

		const lengthWeighted = result.annotations.reduce(
			(accumulator, annotation) => {
				const claimedHere = (
					annotation.highlightPositionsBySection?.[sectionIndex] ?? []
				).length;
				const unitLength = unitLengthOf(annotation.chordProgression);
				if (claimedHere === 0 || unitLength === 0) return accumulator;
				return {
					weightedLength:
						accumulator.weightedLength + unitLength * claimedHere,
					length3:
						accumulator.length3 +
						(unitLength === UNIT_LENGTH_3 ? claimedHere : 0),
					length4Plus:
						accumulator.length4Plus +
						(unitLength >= UNIT_LENGTH_4 ? claimedHere : 0)
				};
			},
			{ weightedLength: 0, length3: 0, length4Plus: 0 }
		);

		return {
			covered: claimed.size,
			coreCovered,
			startCovered: claimed.has(FIRST_SECTION_POSITION),
			openingAligned: openingUnitMatchesPrefix(
				section,
				sectionIndex,
				result.annotations
			),
			interiorSingletons: uncovered.filter((position) =>
				isInteriorSingleton(
					sectionIndex,
					position,
					section,
					claimedBySection,
					sectionLengths,
					result.annotations
				)
			).length,
			interiorRuns: uncoveredRuns.filter((run) =>
				isInteriorRun(run, sectionLength)
			).length,
			weightedLength: lengthWeighted.weightedLength,
			length3: lengthWeighted.length3,
			length4Plus: lengthWeighted.length4Plus
		};
	});

	const coveredChords = perSection.reduce((sum, section) => sum + section.covered, 0);
	const coreCoveredChords = perSection.reduce(
		(sum, section) => sum + section.coreCovered,
		0
	);
	const gapCoveredChords = coveredChords - coreCoveredChords;
	const sectionsStartingCovered = perSection.filter(
		(section) => section.startCovered
	).length;
	const openingPrefixAlignedSections = perSection.filter(
		(section) => section.openingAligned
	).length;
	const interiorSingletonCount = perSection.reduce(
		(sum, section) => sum + section.interiorSingletons,
		0
	);
	const interiorUncoveredRunCount = perSection.reduce(
		(sum, section) => sum + section.interiorRuns,
		0
	);
	const coveredByLength3 = perSection.reduce(
		(sum, section) => sum + section.length3,
		0
	);
	const coveredByLength4Plus = perSection.reduce(
		(sum, section) => sum + section.length4Plus,
		0
	);
	const weightedLength = perSection.reduce(
		(sum, section) => sum + section.weightedLength,
		0
	);

	return {
		songKey: song.songKey,
		title: song.title,
		artists: song.artists,
		totalChords,
		coveredChords,
		coveragePercent: percentOf(coveredChords, totalChords),
		coreCoveredChords,
		gapCoveredChords,
		coreCoveragePercent: percentOf(coreCoveredChords, totalChords),
		gapCoveragePercent: percentOf(gapCoveredChords, totalChords),
		sectionCount,
		sectionsStartingCovered,
		sectionStartRate: percentOf(sectionsStartingCovered, sectionCount),
		interiorSingletonCount,
		interiorUncoveredRunCount,
		coveredByLength3,
		coveredByLength4Plus,
		meanUnitLength: coveredChords > 0 ? weightedLength / coveredChords : 0,
		openingPrefixAlignedSections,
		openingPrefixAlignRate: percentOf(
			openingPrefixAlignedSections,
			sectionCount
		)
	};
};
