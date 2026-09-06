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

const progressionKeysFromCounts = (
	counts: readonly SongProgressionCount[],
	progressionSet: ReadonlySet<string>
): string[] => [
	...new Set(
		counts
			.filter((count) => progressionSet.has(count.chordProgression))
			.map((count) => count.chordProgression)
	)
];

export const coveragePercentForProgressions = (
	song: SongCoverageEntry,
	progressionSet: ReadonlySet<string>
): number => {
	const summed = song.progressionCounts
		.filter((count) => progressionSet.has(count.chordProgression))
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
	song.progressionCounts.some((count) =>
		progressionSet.has(count.chordProgression)
	);

export const filterCoverageResultForProgressions = (
	result: AllSongsCoverageResult,
	chordProgressions: string[]
): AllSongsCoverageResult => {
	const progressionSet = new Set(chordProgressions);
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
					...progressionKeysFromCounts(song.progressionCounts, progressionSet)
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
