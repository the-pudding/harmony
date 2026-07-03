import type { GroupedSong } from "../../progressions/songBrowser.js";
import type { ProgressionWithMatchStats } from "./progressionMatchAnalysis.js";
import { computeCoveredPositionsBySection } from "./progressionMatchAnalysis.js";

export type SectionCoverage = number[][];

export type SelectionResult = {
	selected: ProgressionWithMatchStats[];
	coverage: SectionCoverage;
};

export const emptyCoverage = (song: GroupedSong): SectionCoverage =>
	song.sections.map(() => []);

export const coveragePercent = (
	song: GroupedSong,
	coverage: SectionCoverage
): number => {
	const totalChords = song.sections.reduce(
		(sum, section) => sum + section.parsedProgression.length,
		0
	);
	if (totalChords === 0) return 0;
	const coveredCount = coverage.reduce(
		(sum, positions) => sum + positions.length,
		0
	);
	return (coveredCount / totalChords) * 100;
};

const progressionChordCount = (chordProgression: string): number =>
	chordProgression.split("-").length;

const hasOverlapWithCoverage = (
	newPositions: SectionCoverage,
	existing: SectionCoverage
): boolean =>
	newPositions.some((positions, sectionIndex) =>
		positions.some((pos) => (existing[sectionIndex] ?? []).includes(pos))
	);

const mergeCoverage = (
	existing: SectionCoverage,
	newPositions: SectionCoverage
): SectionCoverage =>
	existing.map((existingPositions, sectionIndex) => [
		...existingPositions,
		...(newPositions[sectionIndex] ?? [])
	]);

export const greedilySelectProgressions = (
	song: GroupedSong,
	candidates: ProgressionWithMatchStats[],
	initialCoverage: SectionCoverage
): SelectionResult => {
	const coverageMap = new Map(
		candidates.map((candidate) => [
			candidate.chordProgression,
			computeCoveredPositionsBySection(song, candidate.parsedProgression)
		])
	);

	const totalMatchedChords = (chordProgression: string): number =>
		(coverageMap.get(chordProgression) ?? []).reduce(
			(sum, positions) => sum + positions.length,
			0
		);

	const sorted = [...candidates].sort((a, b) => {
		const coverageDiff =
			totalMatchedChords(b.chordProgression) -
			totalMatchedChords(a.chordProgression);
		if (coverageDiff !== 0) return coverageDiff;
		return (
			progressionChordCount(b.chordProgression) -
			progressionChordCount(a.chordProgression)
		);
	});

	return sorted.reduce<SelectionResult>(
		({ selected, coverage }, candidate) => {
			const newPositions = coverageMap.get(candidate.chordProgression) ?? [];
			if (hasOverlapWithCoverage(newPositions, coverage)) {
				return { selected, coverage };
			}
			return {
				selected: [...selected, candidate],
				coverage: mergeCoverage(coverage, newPositions)
			};
		},
		{ selected: [], coverage: initialCoverage }
	);
};
