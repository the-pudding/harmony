import type { GroupedSong } from "../../../../data/songBrowser.js";
import type {
	ChordAnnotation,
	ProgressionWithMatchStats
} from "../progression-matching-logic/progressionMatchAnalysis.js";

export const COMPACT_MATCH_LIST_COLUMN_COUNT = 2;
export const COMPACT_MATCH_LIST_PRIMARY_ROW_COUNT = 5;
export const COMPACT_MATCH_LIST_OVERFLOW_COLUMN_ROW_COUNT = 4;
export const COMPACT_MATCH_LIST_SLOT_COUNT =
	COMPACT_MATCH_LIST_PRIMARY_ROW_COUNT +
	COMPACT_MATCH_LIST_OVERFLOW_COLUMN_ROW_COUNT;
export const COMPACT_MATCH_LIST_OVERFLOW_SLOT_COUNT = 1;
export const COMPACT_MATCH_LIST_OVERFLOW_VISIBLE_COUNT =
	COMPACT_MATCH_LIST_SLOT_COUNT - COMPACT_MATCH_LIST_OVERFLOW_SLOT_COUNT;
export const MAX_COVERAGE_PERCENT = 100;

export type CompactMatchListOverflow = {
	hiddenCount: number;
	coveragePercent: number;
};

export type CompactMatchList = {
	visibleMatches: ProgressionWithMatchStats[];
	overflow: CompactMatchListOverflow | null;
};

export const songTotalChordCount = (song: GroupedSong): number =>
	song.sections.reduce(
		(sum, section) => sum + section.parsedProgression.length,
		0
	);

const annotationHasClaimedPositions = (
	annotation: ChordAnnotation
): boolean =>
	annotation.highlightPositionsBySection?.some(
		(positions) => positions.length > 0
	) ?? false;

export const uniqueClaimedCoveragePercent = (
	song: GroupedSong,
	annotations: readonly ChordAnnotation[],
	chordProgressions: ReadonlySet<string>
): number => {
	const totalChords = songTotalChordCount(song);
	if (totalChords === 0) return 0;
	const filtered = annotations.filter(
		(annotation) =>
			annotation.chordProgression !== undefined &&
			chordProgressions.has(annotation.chordProgression)
	);
	const claimedCount = song.sections.reduce((sum, _section, sectionIndex) => {
		const positions = new Set(
			filtered.flatMap(
				(annotation) =>
					annotation.highlightPositionsBySection?.[sectionIndex] ?? []
			)
		);
		return sum + positions.size;
	}, 0);
	return Math.min(
		MAX_COVERAGE_PERCENT,
		Math.round((claimedCount / totalChords) * MAX_COVERAGE_PERCENT)
	);
};

const summedCappedCoveragePercent = (
	matches: readonly ProgressionWithMatchStats[]
): number =>
	Math.min(
		MAX_COVERAGE_PERCENT,
		Math.round(
			matches.reduce((total, match) => total + match.coveragePercent, 0)
		)
	);

export const hiddenMatchesCoveragePercent = (
	hiddenMatches: readonly ProgressionWithMatchStats[],
	song: GroupedSong,
	annotations: readonly ChordAnnotation[]
): number => {
	const progressionSet = new Set(
		hiddenMatches.map((match) => match.chordProgression)
	);
	const hasClaimedPositions = annotations.some(
		(annotation) =>
			annotation.chordProgression !== undefined &&
			progressionSet.has(annotation.chordProgression) &&
			annotationHasClaimedPositions(annotation)
	);
	return hasClaimedPositions
		? uniqueClaimedCoveragePercent(song, annotations, progressionSet)
		: summedCappedCoveragePercent(hiddenMatches);
};

export const buildCompactMatchList = (
	matches: readonly ProgressionWithMatchStats[],
	song: GroupedSong,
	annotations: readonly ChordAnnotation[]
): CompactMatchList => {
	if (matches.length <= COMPACT_MATCH_LIST_SLOT_COUNT) {
		return { visibleMatches: [...matches], overflow: null };
	}
	const visibleMatches = matches.slice(
		0,
		COMPACT_MATCH_LIST_OVERFLOW_VISIBLE_COUNT
	);
	const hiddenMatches = matches.slice(
		COMPACT_MATCH_LIST_OVERFLOW_VISIBLE_COUNT
	);
	return {
		visibleMatches,
		overflow: {
			hiddenCount: hiddenMatches.length,
			coveragePercent: hiddenMatchesCoveragePercent(
				hiddenMatches,
				song,
				annotations
			)
		}
	};
};
