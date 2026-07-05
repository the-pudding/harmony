import coreProgressions from "$data/core-progressions.js";
import type {
	GroupedSong,
	SongSection
} from "../../progressions/songBrowser.js";
import type { ParsedProgressionChord } from "../../../../chord-processing/types.js";
import { matchHighlightForCoreProgression } from "../components/progressionColors.js";
import {
	computeCoveredPositionsBySection,
	computeStatsForParsedProgression,
	MIN_PROGRESSION_OCCURRENCES,
	type ProgressionWithMatchStats
} from "./progressionMatchAnalysis.js";
import {
	MIN_PROGRESSION_LENGTH,
	MAX_PROGRESSION_LENGTH,
	isSelfRepeatingProgression
} from "./progressionConstraints.js";
import type { SectionCoverage } from "./greedyProgressionSelection.js";

const coreProgressionNameByChordProgression = new Map(
	coreProgressions.map((progression) => [
		progression.chordProgression,
		progression.name
	])
);

type CandidateWindow = {
	romanTokens: string[];
	parsedProgression: ParsedProgressionChord[];
};

const uncoveredPositionsFromCoverage = (
	sectionLength: number,
	coveredPositions: number[]
): number[] => {
	const covered = new Set(coveredPositions);
	return Array.from({ length: sectionLength }, (_, index) => index).filter(
		(index) => !covered.has(index)
	);
};

const windowsTouchingPositions = (
	section: SongSection,
	positions: number[]
): CandidateWindow[] => {
	const touchSet = new Set(positions);
	const sectionLength = section.parsedProgression.length;

	return section.parsedProgression.flatMap((_, start) => {
		const maxEnd = Math.min(sectionLength, start + MAX_PROGRESSION_LENGTH);
		return Array.from(
			{
				length: Math.max(0, maxEnd - start - MIN_PROGRESSION_LENGTH + 1)
			},
			(_, lengthOffset) => {
				const end = start + MIN_PROGRESSION_LENGTH + lengthOffset;
				const touchesUncovered = Array.from(
					{ length: end - start },
					(__, index) => start + index
				).some((position) => touchSet.has(position));
				if (!touchesUncovered) return null;
				return {
					romanTokens: section.romanTokens.slice(start, end),
					parsedProgression: section.parsedProgression.slice(start, end)
				};
			}
		).filter((window): window is CandidateWindow => window !== null);
	});
};

const uniqueBy = <T>(items: T[], keyOf: (item: T) => string): T[] => {
	const seen = new Set<string>();
	return items.filter((item) => {
		const key = keyOf(item);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};

const hasOverlapWithCoverage = (
	newPositions: SectionCoverage,
	existing: SectionCoverage
): boolean =>
	newPositions.some((positions, sectionIndex) =>
		positions.some((pos) => (existing[sectionIndex] ?? []).includes(pos))
	);

const toGapFillMatch = (
	song: GroupedSong,
	{ romanTokens, parsedProgression }: CandidateWindow
): ProgressionWithMatchStats | null => {
	if (
		romanTokens.length !== parsedProgression.length ||
		parsedProgression.length === 0
	) {
		return null;
	}
	const chordProgression = romanTokens.join("-");

	const stats = computeStatsForParsedProgression(song, parsedProgression);
	if (stats.matchCount < MIN_PROGRESSION_OCCURRENCES) return null;

	const name =
		coreProgressionNameByChordProgression.get(chordProgression) ?? "";
	const isCoreProgression = name !== "";

	return {
		name,
		chordProgression,
		parsedProgression,
		description: "",
		matchCount: stats.matchCount,
		coveragePercent: stats.coveragePercent,
		...matchHighlightForCoreProgression(isCoreProgression)
	};
};

const progressionLength = (match: ProgressionWithMatchStats): number =>
	match.chordProgression.split("-").length;

export const computeGapFillProgressionMatches = (
	song: GroupedSong,
	initialCoverage: SectionCoverage
): ProgressionWithMatchStats[] => {
	const candidateWindows = song.sections.flatMap((section, sectionIndex) => {
		const uncovered = uncoveredPositionsFromCoverage(
			section.parsedProgression.length,
			initialCoverage[sectionIndex] ?? []
		);
		return windowsTouchingPositions(section, uncovered);
	});

	if (candidateWindows.length === 0) return [];

	const uniqueWindows = uniqueBy(candidateWindows, (window) =>
		window.romanTokens.join("-")
	);

	return uniqueWindows
		.map((window) => toGapFillMatch(song, window))
		.filter((match): match is ProgressionWithMatchStats => match !== null)
		.filter((match) => !isSelfRepeatingProgression(match.chordProgression))
		.filter((match) => !match.isCoreProgression)
		.filter(
			(match) =>
				!hasOverlapWithCoverage(
					computeCoveredPositionsBySection(song, match.parsedProgression),
					initialCoverage
				)
		)
		.sort(
			(a, b) =>
				b.coveragePercent - a.coveragePercent ||
				progressionLength(b) - progressionLength(a) ||
				a.chordProgression.localeCompare(b.chordProgression)
		);
};
