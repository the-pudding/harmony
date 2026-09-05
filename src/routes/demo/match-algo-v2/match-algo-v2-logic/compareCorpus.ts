import type { SongAlgoMetrics } from "./algoMetrics.js";
import { PERCENT_MULTIPLIER } from "./algoMetrics.js";

export const COVERAGE_BUCKET_WIDTH = 10;
export const COVERAGE_BUCKET_MAX_START = 90;
export const WORSE_SONGS_LIMIT = 8;
export const IMPROVED_SONGS_LIMIT = 8;

export type CoverageBucket = {
	start: number;
	label: string;
	count: number;
};

export type CorpusSideStats = {
	songCount: number;
	meanCoverage: number;
	medianCoverage: number;
	meanCoreCoverage: number;
	meanGapCoverage: number;
	meanUncovered: number;
	meanSectionStartRate: number;
	meanOpeningPrefixAlignRate: number;
	meanInteriorSingletons: number;
	meanInteriorUncoveredRuns: number;
	meanUnitLength: number;
	length3ShareOfCovered: number;
	length4PlusShareOfCovered: number;
};

export type ComparedSongRow = {
	songKey: string;
	title: string;
	artists: string[];
	metrics: SongAlgoMetrics;
};

export type CorpusComparison = {
	songCount: number;
	stats: CorpusSideStats;
	coverageHistogram: CoverageBucket[];
	lowestCoverage: ComparedSongRow[];
	highestCoverage: ComparedSongRow[];
	mostInteriorHoles: ComparedSongRow[];
};

export const coverageBucketStart = (percent: number): number =>
	Math.min(
		COVERAGE_BUCKET_MAX_START,
		Math.floor(percent / COVERAGE_BUCKET_WIDTH) * COVERAGE_BUCKET_WIDTH
	);

export const coverageBucketLabel = (start: number): string =>
	start === COVERAGE_BUCKET_MAX_START
		? `${start}–${PERCENT_MULTIPLIER}`
		: `${start}–${start + COVERAGE_BUCKET_WIDTH - 1}`;

const emptyHistogram = (): CoverageBucket[] =>
	Array.from(
		{
			length: COVERAGE_BUCKET_MAX_START / COVERAGE_BUCKET_WIDTH + 1
		},
		(_, index) => {
			const start = index * COVERAGE_BUCKET_WIDTH;
			return {
				start,
				label: coverageBucketLabel(start),
				count: 0
			};
		}
	);

const meanOf = (values: number[]): number =>
	values.length === 0
		? 0
		: values.reduce((sum, value) => sum + value, 0) / values.length;

const medianOf = (values: number[]): number => {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
		: (sorted[middle] ?? 0);
};

const sideStats = (rows: SongAlgoMetrics[]): CorpusSideStats => {
	const coverages = rows.map((row) => row.coveragePercent);
	const coveredChords = rows.reduce((sum, row) => sum + row.coveredChords, 0);
	const length3 = rows.reduce((sum, row) => sum + row.coveredByLength3, 0);
	const length4Plus = rows.reduce((sum, row) => sum + row.coveredByLength4Plus, 0);
	return {
		songCount: rows.length,
		meanCoverage: meanOf(coverages),
		medianCoverage: medianOf(coverages),
		meanCoreCoverage: meanOf(rows.map((row) => row.coreCoveragePercent)),
		meanGapCoverage: meanOf(rows.map((row) => row.gapCoveragePercent)),
		meanUncovered: meanOf(
			rows.map((row) => PERCENT_MULTIPLIER - row.coveragePercent)
		),
		meanSectionStartRate: meanOf(rows.map((row) => row.sectionStartRate)),
		meanOpeningPrefixAlignRate: meanOf(
			rows.map((row) => row.openingPrefixAlignRate)
		),
		meanInteriorSingletons: meanOf(
			rows.map((row) => row.interiorSingletonCount)
		),
		meanInteriorUncoveredRuns: meanOf(
			rows.map((row) => row.interiorUncoveredRunCount)
		),
		meanUnitLength: meanOf(rows.map((row) => row.meanUnitLength)),
		length3ShareOfCovered: coveredChords > 0 ? length3 / coveredChords : 0,
		length4PlusShareOfCovered: coveredChords > 0 ? length4Plus / coveredChords : 0
	};
};

export const toComparedSongRow = (metrics: SongAlgoMetrics): ComparedSongRow => ({
	songKey: metrics.songKey,
	title: metrics.title,
	artists: metrics.artists,
	metrics
});

export const aggregateCorpusComparison = (
	rows: SongAlgoMetrics[]
): CorpusComparison => {
	const compared = rows.map(toComparedSongRow);
	const histogram = emptyHistogram();
	const histogramWithCounts = rows.reduce((buckets, row) => {
		const start = coverageBucketStart(row.coveragePercent);
		return buckets.map((bucket) => ({
			...bucket,
			count: bucket.count + (bucket.start === start ? 1 : 0)
		}));
	}, histogram);

	const lowestCoverage = [...compared]
		.sort((a, b) => a.metrics.coveragePercent - b.metrics.coveragePercent)
		.slice(0, WORSE_SONGS_LIMIT);
	const highestCoverage = [...compared]
		.sort((a, b) => b.metrics.coveragePercent - a.metrics.coveragePercent)
		.slice(0, IMPROVED_SONGS_LIMIT);
	const mostInteriorHoles = [...compared]
		.filter((row) => row.metrics.interiorSingletonCount > 0)
		.sort(
			(a, b) =>
				b.metrics.interiorSingletonCount - a.metrics.interiorSingletonCount
		)
		.slice(0, WORSE_SONGS_LIMIT);

	return {
		songCount: rows.length,
		stats: sideStats(rows),
		coverageHistogram: histogramWithCounts,
		lowestCoverage,
		highestCoverage,
		mostInteriorHoles
	};
};
