import type { SongAlgoMetrics } from "./algoMetrics.js";
import { PERCENT_MULTIPLIER } from "./algoMetrics.js";

export const COVERAGE_BUCKET_WIDTH = 10;
export const COVERAGE_BUCKET_MAX_START = 90;
export const COVERAGE_TIE_EPSILON = 0.5;
export const WORSE_SONGS_LIMIT = 8;
export const IMPROVED_SONGS_LIMIT = 8;

export type CoverageBucket = {
	start: number;
	label: string;
	v1Count: number;
	v2Count: number;
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

export type AxisVerdict = "better" | "worse" | "similar";

export type CorpusDeltas = {
	meanCoverage: number;
	meanCoreCoverage: number;
	meanGapCoverage: number;
	meanSectionStartRate: number;
	meanOpeningPrefixAlignRate: number;
	meanInteriorSingletons: number;
	meanUnitLength: number;
	length3ShareOfCovered: number;
};

export type WinLossCounts = {
	v2HigherCoverage: number;
	v2LowerCoverage: number;
	coverageTie: number;
	v2FewerInteriorHoles: number;
	v2MoreInteriorHoles: number;
	interiorHoleTie: number;
	v2MoreSectionStarts: number;
	v2FewerSectionStarts: number;
	sectionStartTie: number;
};

export type ComparedSongRow = {
	songKey: string;
	title: string;
	artists: string[];
	v1: SongAlgoMetrics;
	v2: SongAlgoMetrics;
	coverageDelta: number;
	interiorSingletonDelta: number;
	sectionStartRateDelta: number;
	meanUnitLengthDelta: number;
	length3ShareDelta: number;
};

export type CorpusComparison = {
	songCount: number;
	v1: CorpusSideStats;
	v2: CorpusSideStats;
	deltas: CorpusDeltas;
	verdicts: {
		coverage: AxisVerdict;
		sectionStarts: AxisVerdict;
		interiorHoles: AxisVerdict;
		unitLength: AxisVerdict;
		shortGreedy: AxisVerdict;
	};
	winLoss: WinLossCounts;
	coverageHistogram: CoverageBucket[];
	worseByCoverage: ComparedSongRow[];
	improvedByCoverage: ComparedSongRow[];
	worseByInteriorHoles: ComparedSongRow[];
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
				v1Count: 0,
				v2Count: 0
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

const length3Share = (metrics: SongAlgoMetrics): number =>
	metrics.coveredChords > 0
		? metrics.coveredByLength3 / metrics.coveredChords
		: 0;

const length4PlusShare = (metrics: SongAlgoMetrics): number =>
	metrics.coveredChords > 0
		? metrics.coveredByLength4Plus / metrics.coveredChords
		: 0;

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

const compareAxisHigherIsBetter = (delta: number): AxisVerdict => {
	if (Math.abs(delta) <= COVERAGE_TIE_EPSILON) return "similar";
	return delta > 0 ? "better" : "worse";
};

const compareAxisLowerIsBetter = (delta: number): AxisVerdict => {
	if (Math.abs(delta) <= COVERAGE_TIE_EPSILON) return "similar";
	return delta < 0 ? "better" : "worse";
};

const countBy = (
	rows: ComparedSongRow[],
	deltaOf: (row: ComparedSongRow) => number,
	epsilon: number
): { higher: number; lower: number; tie: number } =>
	rows.reduce(
		(counts, row) => {
			const delta = deltaOf(row);
			if (Math.abs(delta) <= epsilon) {
				return { ...counts, tie: counts.tie + 1 };
			}
			return delta > 0
				? { ...counts, higher: counts.higher + 1 }
				: { ...counts, lower: counts.lower + 1 };
		},
		{ higher: 0, lower: 0, tie: 0 }
	);

export const compareSongMetrics = (
	v1: SongAlgoMetrics,
	v2: SongAlgoMetrics
): ComparedSongRow => ({
	songKey: v2.songKey,
	title: v2.title,
	artists: v2.artists,
	v1,
	v2,
	coverageDelta: v2.coveragePercent - v1.coveragePercent,
	interiorSingletonDelta:
		v2.interiorSingletonCount - v1.interiorSingletonCount,
	sectionStartRateDelta: v2.sectionStartRate - v1.sectionStartRate,
	meanUnitLengthDelta: v2.meanUnitLength - v1.meanUnitLength,
	length3ShareDelta: length3Share(v2) - length3Share(v1)
});

export const aggregateCorpusComparison = (
	pairs: Array<{ v1: SongAlgoMetrics; v2: SongAlgoMetrics }>
): CorpusComparison => {
	const rows = pairs.map(({ v1, v2 }) => compareSongMetrics(v1, v2));
	const v1Stats = sideStats(rows.map((row) => row.v1));
	const v2Stats = sideStats(rows.map((row) => row.v2));
	const deltas: CorpusDeltas = {
		meanCoverage: v2Stats.meanCoverage - v1Stats.meanCoverage,
		meanCoreCoverage: v2Stats.meanCoreCoverage - v1Stats.meanCoreCoverage,
		meanGapCoverage: v2Stats.meanGapCoverage - v1Stats.meanGapCoverage,
		meanSectionStartRate:
			v2Stats.meanSectionStartRate - v1Stats.meanSectionStartRate,
		meanOpeningPrefixAlignRate:
			v2Stats.meanOpeningPrefixAlignRate - v1Stats.meanOpeningPrefixAlignRate,
		meanInteriorSingletons:
			v2Stats.meanInteriorSingletons - v1Stats.meanInteriorSingletons,
		meanUnitLength: v2Stats.meanUnitLength - v1Stats.meanUnitLength,
		length3ShareOfCovered:
			v2Stats.length3ShareOfCovered - v1Stats.length3ShareOfCovered
	};

	const coverageCounts = countBy(rows, (row) => row.coverageDelta, COVERAGE_TIE_EPSILON);
	const holeCounts = countBy(
		rows,
		(row) => -row.interiorSingletonDelta,
		0
	);
	const startCounts = countBy(
		rows,
		(row) => row.sectionStartRateDelta,
		COVERAGE_TIE_EPSILON
	);

	const histogram = emptyHistogram();
	const histogramWithCounts = pairs.reduce((buckets, { v1, v2 }) => {
		const v1Start = coverageBucketStart(v1.coveragePercent);
		const v2Start = coverageBucketStart(v2.coveragePercent);
		return buckets.map((bucket) => ({
			...bucket,
			v1Count: bucket.v1Count + (bucket.start === v1Start ? 1 : 0),
			v2Count: bucket.v2Count + (bucket.start === v2Start ? 1 : 0)
		}));
	}, histogram);

	const worseByCoverage = [...rows]
		.filter((row) => row.coverageDelta < -COVERAGE_TIE_EPSILON)
		.sort((a, b) => a.coverageDelta - b.coverageDelta)
		.slice(0, WORSE_SONGS_LIMIT);
	const improvedByCoverage = [...rows]
		.filter((row) => row.coverageDelta > COVERAGE_TIE_EPSILON)
		.sort((a, b) => b.coverageDelta - a.coverageDelta)
		.slice(0, IMPROVED_SONGS_LIMIT);
	const worseByInteriorHoles = [...rows]
		.filter((row) => row.interiorSingletonDelta > 0)
		.sort((a, b) => b.interiorSingletonDelta - a.interiorSingletonDelta)
		.slice(0, WORSE_SONGS_LIMIT);

	return {
		songCount: rows.length,
		v1: v1Stats,
		v2: v2Stats,
		deltas,
		verdicts: {
			coverage: compareAxisHigherIsBetter(deltas.meanCoverage),
			sectionStarts: compareAxisHigherIsBetter(deltas.meanSectionStartRate),
			interiorHoles: compareAxisLowerIsBetter(deltas.meanInteriorSingletons),
			unitLength: compareAxisHigherIsBetter(deltas.meanUnitLength),
			shortGreedy: compareAxisLowerIsBetter(deltas.length3ShareOfCovered)
		},
		winLoss: {
			v2HigherCoverage: coverageCounts.higher,
			v2LowerCoverage: coverageCounts.lower,
			coverageTie: coverageCounts.tie,
			v2FewerInteriorHoles: holeCounts.higher,
			v2MoreInteriorHoles: holeCounts.lower,
			interiorHoleTie: holeCounts.tie,
			v2MoreSectionStarts: startCounts.higher,
			v2FewerSectionStarts: startCounts.lower,
			sectionStartTie: startCounts.tie
		},
		coverageHistogram: histogramWithCounts,
		worseByCoverage,
		improvedByCoverage,
		worseByInteriorHoles
	};
};
