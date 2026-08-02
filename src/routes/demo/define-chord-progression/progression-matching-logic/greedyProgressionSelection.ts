import type { GroupedSong } from "../../../../data/songBrowser.js";
import type { ProgressionWithMatchStats } from "./progressionMatchAnalysis.js";
import {
	computeCoveredPositionsBySection,
	countSectionsStartedByProgression
} from "./progressionMatchAnalysis.js";

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

export const mergeCoverage = (
	existing: SectionCoverage,
	newPositions: SectionCoverage
): SectionCoverage =>
	existing.map((existingPositions, sectionIndex) => [
		...existingPositions,
		...(newPositions[sectionIndex] ?? [])
	]);

export const PREFER_SECTION_START_MAX_COVERAGE_SACRIFICE_PERCENT = 5;

const LOG_SECTION_START_BIAS_OVERRIDES = true;

const logBiasOverride = (
	song: GroupedSong,
	winner: ProgressionWithMatchStats,
	leader: ProgressionWithMatchStats,
	winnerStartCount: number,
	coverageDiff: number
): void => {
	if (!LOG_SECTION_START_BIAS_OVERRIDES) return;
	const origin =
		typeof location !== "undefined" ? location.origin : "http://localhost:5173";
	const url = `${origin}/demo/define-chord-progression/?song=${song.songKey}`;
	console.log(
		`[section-start bias] ${song.title} — ${winner.chordProgression} (starts ${winnerStartCount} section${winnerStartCount === 1 ? "" : "s"}) over ${leader.chordProgression} (-${coverageDiff} chord${coverageDiff === 1 ? "" : "s"})\n  ${url}`
	);
};

type GreedySelectOptions = {
	getCandidateCoverage?: (
		candidate: ProgressionWithMatchStats
	) => SectionCoverage;
	getCandidateSectionStartCount?: (
		candidate: ProgressionWithMatchStats
	) => number;
};

export const greedilySelectProgressions = (
	song: GroupedSong,
	candidates: ProgressionWithMatchStats[],
	initialCoverage: SectionCoverage,
	{
		getCandidateCoverage,
		getCandidateSectionStartCount
	}: GreedySelectOptions = {}
): SelectionResult => {
	const totalChords = song.sections.reduce(
		(sum, section) => sum + section.parsedProgression.length,
		0
	);

	const toleranceChords = Math.round(
		(totalChords * PREFER_SECTION_START_MAX_COVERAGE_SACRIFICE_PERCENT) / 100
	);

	const coverageMap = new Map(
		candidates.map((candidate) => [
			candidate.chordProgression,
			getCandidateCoverage
				? getCandidateCoverage(candidate)
				: computeCoveredPositionsBySection(song, candidate.parsedProgression)
		])
	);

	const sectionStartCountMap = new Map(
		candidates.map((candidate) => [
			candidate.chordProgression,
			getCandidateSectionStartCount
				? getCandidateSectionStartCount(candidate)
				: countSectionsStartedByProgression(song, candidate.parsedProgression)
		])
	);

	const candidatePositions = (chordProgression: string): SectionCoverage =>
		coverageMap.get(chordProgression) ?? [];

	const totalMatchedChords = (chordProgression: string): number =>
		candidatePositions(chordProgression).reduce(
			(sum, positions) => sum + positions.length,
			0
		);

	const sectionStartCount = (chordProgression: string): number =>
		sectionStartCountMap.get(chordProgression) ?? 0;

	const pickBest = (
		remaining: ProgressionWithMatchStats[],
		coverage: SectionCoverage
	): SelectionResult => {
		const selectable = remaining.filter((candidate) => {
			const count = totalMatchedChords(candidate.chordProgression);
			if (count === 0) return false;
			return !hasOverlapWithCoverage(
				candidatePositions(candidate.chordProgression),
				coverage
			);
		});

		if (selectable.length === 0) return { selected: [], coverage };

		const leaderCount = Math.max(
			...selectable.map((c) => totalMatchedChords(c.chordProgression))
		);

		const window = selectable.filter(
			(c) =>
				leaderCount - totalMatchedChords(c.chordProgression) <= toleranceChords
		);

		const winner = window.reduce((best, candidate) => {
			const bestStarts = sectionStartCount(best.chordProgression);
			const candidateStarts = sectionStartCount(candidate.chordProgression);
			if (candidateStarts > bestStarts) return candidate;
			if (candidateStarts < bestStarts) return best;
			const bestCount = totalMatchedChords(best.chordProgression);
			const candidateCount = totalMatchedChords(candidate.chordProgression);
			if (candidateCount > bestCount) return candidate;
			if (candidateCount < bestCount) return best;
			const bestLength = progressionChordCount(best.chordProgression);
			const candidateLength = progressionChordCount(candidate.chordProgression);
			return candidateLength > bestLength ? candidate : best;
		});

		const leader = selectable.find(
			(c) => totalMatchedChords(c.chordProgression) === leaderCount
		)!;

		const biasApplied =
			winner.chordProgression !== leader.chordProgression &&
			sectionStartCount(winner.chordProgression) >
				sectionStartCount(leader.chordProgression);

		const coverageDiff =
			leaderCount - totalMatchedChords(winner.chordProgression);

		if (biasApplied) {
			logBiasOverride(
				song,
				winner,
				leader,
				sectionStartCount(winner.chordProgression),
				coverageDiff
			);
		}

		const sacrificedPercent =
			totalChords > 0 ? Math.round((coverageDiff / totalChords) * 100) : 0;

		const markedWinner = biasApplied
			? {
					...winner,
					isSectionStartBiasWinner: true,
					sectionStartBiasSacrificedPercent: sacrificedPercent
				}
			: winner;

		const winnerPositions = candidatePositions(winner.chordProgression);
		const nextCoverage = mergeCoverage(coverage, winnerPositions);
		const nextRemaining = remaining.filter(
			(c) => c.chordProgression !== winner.chordProgression
		);

		const rest = pickBest(nextRemaining, nextCoverage);
		return {
			selected: [markedWinner, ...rest.selected],
			coverage: rest.coverage
		};
	};

	return pickBest(candidates, initialCoverage);
};
