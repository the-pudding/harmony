import type {
	SongBiasOverride,
	SongCoverageEntry,
	SongProgressionCount
} from "./computeSongCoverage.js";

export type AllSongsCoverageResult = {
	songCoverages: SongCoverageEntry[];
	progressionMatchRates: Record<string, number>;
	progressionMatchCounts: Record<string, number>;
	biasOverrides: SongBiasOverride[];
};

export const MAX_COVERAGE_PERCENT = 100;

// Identity is the progression's canonical name (see SongProgressionCount.name)
// rather than literal chordProgression spelling, since the same core can
// match as different authored variants or triad-folded spellings across
// songs. For non-core counts, name already equals the literal string.
const progressionNamesFromCounts = (
	counts: readonly SongProgressionCount[],
	progressionSet: ReadonlySet<string>
): string[] => [
	...new Set(
		counts
			.filter((count) => progressionSet.has(count.name))
			.map((count) => count.name)
	)
];

export const coveragePercentForProgressions = (
	song: SongCoverageEntry,
	progressionSet: ReadonlySet<string>
): number => {
	const summed = song.progressionCounts
		.filter((count) => progressionSet.has(count.name))
		.reduce((total, count) => total + count.coveragePercent, 0);
	return Math.min(MAX_COVERAGE_PERCENT, Math.round(summed));
};

const songMatchesProgressions = (
	song: SongCoverageEntry,
	progressionSet: ReadonlySet<string>
): boolean =>
	song.matchingProgressions.some((progression) =>
		progressionSet.has(progression)
	) ||
	song.progressionCounts.some((count) => progressionSet.has(count.name));

export const filterCoverageResultForProgressions = (
	result: AllSongsCoverageResult,
	progressionNames: string[]
): AllSongsCoverageResult => {
	const progressionSet = new Set(progressionNames);
	const songCoverages = result.songCoverages
		.filter((song) => songMatchesProgressions(song, progressionSet))
		.map((song) => ({
			...song,
			coveragePercent: coveragePercentForProgressions(song, progressionSet),
			matchingProgressions: [
				...new Set([
					...song.matchingProgressions.filter((progression) =>
						progressionSet.has(progression)
					),
					...progressionNamesFromCounts(song.progressionCounts, progressionSet)
				])
			]
		}));
	const filteredSongKeys = new Set(songCoverages.map((song) => song.songKey));
	return {
		songCoverages,
		progressionMatchRates: result.progressionMatchRates,
		progressionMatchCounts: result.progressionMatchCounts,
		biasOverrides: result.biasOverrides.filter((override) =>
			filteredSongKeys.has(override.songKey)
		)
	};
};
