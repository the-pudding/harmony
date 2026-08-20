import type { GroupedSong } from "../../../../data/songBrowser.js";
import type { ProgressionWithMatchStats } from "./progressionMatchAnalysis.js";
import {
	getSectionMatches,
	matchPositions,
	MIN_FULL_SECTION_OCCURRENCES,
	MIN_PROGRESSION_OCCURRENCES
} from "./progressionMatchAnalysis.js";

export type SectionCoverage = number[][];

// One concrete occurrence of a progression inside one section. Selection works
// at instance granularity so a progression that collides with already-claimed
// chords in one spot can still claim the spots it does not compete for.
export type ProgressionInstance = {
	sectionIndex: number;
	positions: number[];
	startsSection: boolean;
};

export type SectionStartBiasOverride = {
	winnerProgression: string;
	leaderProgression: string;
	sacrificedPercent: number;
};

export type SelectionResult = {
	selected: ProgressionWithMatchStats[];
	coverage: SectionCoverage;
	biasOverrides: SectionStartBiasOverride[];
};

export const emptyCoverage = (song: GroupedSong): SectionCoverage =>
	song.sections.map(() => []);

const songChordCount = (song: GroupedSong): number =>
	song.sections.reduce(
		(sum, section) => sum + section.parsedProgression.length,
		0
	);

export const coveragePercent = (
	song: GroupedSong,
	coverage: SectionCoverage
): number => {
	const totalChords = songChordCount(song);
	if (totalChords === 0) return 0;
	const coveredCount = coverage.reduce(
		(sum, positions) => sum + positions.length,
		0
	);
	return (coveredCount / totalChords) * 100;
};

const progressionChordCount = (chordProgression: string): number =>
	chordProgression.split("-").length;

export const mergeCoverage = (
	existing: SectionCoverage,
	newPositions: SectionCoverage
): SectionCoverage =>
	existing.map((existingPositions, sectionIndex) => [
		...existingPositions,
		...(newPositions[sectionIndex] ?? [])
	]);

export const PREFER_SECTION_START_MAX_COVERAGE_SACRIFICE_PERCENT = 5;

export const progressionInstances = (
	song: GroupedSong,
	candidate: ProgressionWithMatchStats
): ProgressionInstance[] =>
	song.sections.flatMap((section, sectionIndex) =>
		getSectionMatches(
			section,
			candidate.parsedProgression,
			candidate.matchRomanNumeralsExactly ?? false
		).map((match) => ({
			sectionIndex,
			positions: matchPositions(match, section.parsedProgression.length),
			startsSection: match.start === 0
		}))
	);

const toClaimedSets = (coverage: SectionCoverage): Set<number>[] =>
	coverage.map((positions) => new Set(positions));

const instancesLandingInFreeSpace = (
	instances: ProgressionInstance[],
	claimed: Set<number>[]
): ProgressionInstance[] =>
	instances.filter(({ sectionIndex, positions }) =>
		positions.every((position) => !claimed[sectionIndex]?.has(position))
	);

export const coverageFromInstances = (
	song: GroupedSong,
	instances: ProgressionInstance[]
): SectionCoverage =>
	song.sections.map((_, sectionIndex) =>
		instances
			.filter((instance) => instance.sectionIndex === sectionIndex)
			.flatMap((instance) => instance.positions)
			.sort((a, b) => a - b)
	);

type GreedySelectOptions = {
	getCandidateInstances?: (
		candidate: ProgressionWithMatchStats
	) => ProgressionInstance[];
};

type ScoredCandidate = {
	candidate: ProgressionWithMatchStats;
	available: ProgressionInstance[];
	coverage: SectionCoverage;
	matchedChords: number;
	sectionStarts: number;
};

const fillsEntireSection = (
	song: GroupedSong,
	{ sectionIndex, positions }: ProgressionInstance
): boolean =>
	positions.length === song.sections[sectionIndex].parsedProgression.length;

// A progression earns its place by recurring, so it has to keep recurring in the
// space earlier picks left behind — a lone surviving fragment is not a match.
// The single-instance exception stays core-only, matching candidate intake.
const stillEarnsItsPlace = (
	song: GroupedSong,
	{ candidate, available }: ScoredCandidate
): boolean =>
	available.length >= MIN_PROGRESSION_OCCURRENCES ||
	(available.length === MIN_FULL_SECTION_OCCURRENCES &&
		candidate.isCoreProgression &&
		fillsEntireSection(song, available[0]));

export const greedilySelectProgressions = (
	song: GroupedSong,
	candidates: ProgressionWithMatchStats[],
	initialCoverage: SectionCoverage,
	{ getCandidateInstances }: GreedySelectOptions = {}
): SelectionResult => {
	const totalChords = songChordCount(song);

	const toleranceChords = Math.round(
		(totalChords * PREFER_SECTION_START_MAX_COVERAGE_SACRIFICE_PERCENT) / 100
	);

	const instancesByProgression = new Map(
		candidates.map((candidate) => [
			candidate.chordProgression,
			getCandidateInstances
				? getCandidateInstances(candidate)
				: progressionInstances(song, candidate)
		])
	);

	const scoreAgainstCoverage = (
		candidate: ProgressionWithMatchStats,
		claimed: Set<number>[]
	): ScoredCandidate => {
		const available = instancesLandingInFreeSpace(
			instancesByProgression.get(candidate.chordProgression) ?? [],
			claimed
		);
		return {
			candidate,
			available,
			coverage: coverageFromInstances(song, available),
			matchedChords: available.reduce(
				(sum, instance) => sum + instance.positions.length,
				0
			),
			sectionStarts: new Set(
				available
					.filter((instance) => instance.startsSection)
					.map((instance) => instance.sectionIndex)
			).size
		};
	};

	const preferred = (best: ScoredCandidate, contender: ScoredCandidate) => {
		if (contender.sectionStarts !== best.sectionStarts) {
			return contender.sectionStarts > best.sectionStarts ? contender : best;
		}
		if (contender.matchedChords !== best.matchedChords) {
			return contender.matchedChords > best.matchedChords ? contender : best;
		}
		return progressionChordCount(contender.candidate.chordProgression) >
			progressionChordCount(best.candidate.chordProgression)
			? contender
			: best;
	};

	const pickBest = (
		remaining: ProgressionWithMatchStats[],
		coverage: SectionCoverage
	): SelectionResult => {
		const claimed = toClaimedSets(coverage);
		const selectable = remaining
			.map((candidate) => scoreAgainstCoverage(candidate, claimed))
			.filter((scored) => stillEarnsItsPlace(song, scored));

		if (selectable.length === 0) {
			return { selected: [], coverage, biasOverrides: [] };
		}

		const leaderCount = Math.max(
			...selectable.map((scored) => scored.matchedChords)
		);
		const leader = selectable.find(
			(scored) => scored.matchedChords === leaderCount
		)!;
		const winner = selectable
			.filter((scored) => leaderCount - scored.matchedChords <= toleranceChords)
			.reduce(preferred);

		const biasApplied =
			winner.candidate.chordProgression !== leader.candidate.chordProgression &&
			winner.sectionStarts > leader.sectionStarts;

		const sacrificedPercent =
			totalChords > 0
				? Math.round(((leaderCount - winner.matchedChords) / totalChords) * 100)
				: 0;

		const roundOverride: SectionStartBiasOverride | null = biasApplied
			? {
					winnerProgression: winner.candidate.chordProgression,
					leaderProgression: leader.candidate.chordProgression,
					sacrificedPercent
				}
			: null;

		const markedWinner = biasApplied
			? {
					...winner.candidate,
					isSectionStartBiasWinner: true,
					sectionStartBiasSacrificedPercent: sacrificedPercent
				}
			: winner.candidate;

		const rest = pickBest(
			remaining.filter(
				(candidate) =>
					candidate.chordProgression !== winner.candidate.chordProgression
			),
			mergeCoverage(coverage, winner.coverage)
		);
		return {
			selected: [markedWinner, ...rest.selected],
			coverage: rest.coverage,
			biasOverrides: roundOverride
				? [roundOverride, ...rest.biasOverrides]
				: rest.biasOverrides
		};
	};

	return pickBest(candidates, initialCoverage);
};

// A progression only owns the instances that were still free when its turn came,
// so replaying selection order is the only way to recover each one's own share.
export const claimedInstancesInSelectionOrder = (
	song: GroupedSong,
	selected: ProgressionWithMatchStats[],
	initialCoverage: SectionCoverage
): ProgressionInstance[][] =>
	selected.reduce<{ claims: ProgressionInstance[][]; coverage: SectionCoverage }>(
		({ claims, coverage }, candidate) => {
			const instances = instancesLandingInFreeSpace(
				progressionInstances(song, candidate),
				toClaimedSets(coverage)
			);
			return {
				claims: [...claims, instances],
				coverage: mergeCoverage(coverage, coverageFromInstances(song, instances))
			};
		},
		{ claims: [], coverage: initialCoverage }
	).claims;

export const claimedPositionsInSelectionOrder = (
	song: GroupedSong,
	selected: ProgressionWithMatchStats[],
	initialCoverage: SectionCoverage
): SectionCoverage[] =>
	claimedInstancesInSelectionOrder(song, selected, initialCoverage).map(
		(instances) => coverageFromInstances(song, instances)
	);
