import type { DecadeSeries } from "../history/DecadeLineChart.svelte";
import {
	HOMOGENEITY_BANDS,
	MOST_HOMOGENEOUS_BAND,
	type HomogeneityBandShare
} from "../shared/progressionHomogeneity.js";
import { formatEffectiveCount, formatPercent } from "./homogeneityFormat.js";
import type { DecadeStack } from "./DecadeStackedBarChart.svelte";
import type { HorizontalBar } from "./HorizontalBarChart.svelte";
import type { DecadeHomogeneityRow, HistogramBin } from "./homogeneityAnalysis.js";

export const MEDIAN_EFFECTIVE_COLOR = "#fde047";
export const MEAN_EFFECTIVE_COLOR = "#60a5fa";
export const DISTINCT_COUNT_COLOR = "#71717a";
export const DOMINANT_SHARE_COLOR = "#f472b6";

export const toBandBars = (bandShares: readonly HomogeneityBandShare[]): HorizontalBar[] =>
	bandShares.map(({ band, songCount, sharePercent }) => ({
		label: band.label,
		color: band.color,
		songCount,
		sharePercent
	}));

export const toDominantShareBars = (bins: readonly HistogramBin[]): HorizontalBar[] =>
	bins.map((bin) => ({ ...bin, color: DOMINANT_SHARE_COLOR }));

export const toDecadeStacks = (history: readonly DecadeHomogeneityRow[]): DecadeStack[] =>
	history.map((row) => ({
		decade: row.decade,
		songCount: row.songCount,
		segments: HOMOGENEITY_BANDS.map((band) => ({
			id: band.id,
			label: band.label,
			color: band.color,
			sharePercent: row.bandSharePercents[band.id]
		}))
	}));

const decadeSeries = (
	label: string,
	color: string,
	history: readonly DecadeHomogeneityRow[],
	valueOf: (row: DecadeHomogeneityRow) => number
): DecadeSeries => ({
	label,
	color,
	points: history.map((row) => ({ decade: row.decade, value: valueOf(row) }))
});

export const toEffectiveCountSeries = (
	history: readonly DecadeHomogeneityRow[]
): DecadeSeries[] => [
	decadeSeries(
		"median effective progressions",
		MEDIAN_EFFECTIVE_COLOR,
		history,
		(row) => row.medianEffectiveCount
	),
	decadeSeries(
		"mean effective progressions",
		MEAN_EFFECTIVE_COLOR,
		history,
		(row) => row.meanEffectiveCount
	),
	decadeSeries(
		"mean distinct progressions",
		DISTINCT_COUNT_COLOR,
		history,
		(row) => row.meanDistinctCount
	)
];

export const toDominantShareSeries = (
	history: readonly DecadeHomogeneityRow[]
): DecadeSeries[] => [
	decadeSeries(
		"avg share of top progression",
		DOMINANT_SHARE_COLOR,
		history,
		(row) => row.meanDominantSharePercent
	)
];

const findMedianExtremes = (history: readonly DecadeHomogeneityRow[]) =>
	history.length === 0
		? null
		: {
				mostDiverse: history.reduce((best, row) =>
					row.medianEffectiveCount > best.medianEffectiveCount ? row : best
				),
				mostHomogeneous: history.reduce((best, row) =>
					row.medianEffectiveCount < best.medianEffectiveCount ? row : best
				)
			};

export const describeMedianTrend = (history: readonly DecadeHomogeneityRow[]): string => {
	const extremes = findMedianExtremes(history);
	if (!extremes) return "";
	const { mostDiverse, mostHomogeneous } = extremes;
	const singleLoopPercent = (row: DecadeHomogeneityRow) =>
		formatPercent(row.bandSharePercents[MOST_HOMOGENEOUS_BAND.id]);
	return `The median song went from ${formatEffectiveCount(mostDiverse.medianEffectiveCount)} effective progressions in the ${mostDiverse.decade}s (the most diverse decade) to ${formatEffectiveCount(mostHomogeneous.medianEffectiveCount)} in the ${mostHomogeneous.decade}s (the most homogeneous), while the share of songs that are essentially one loop went from ${singleLoopPercent(mostDiverse)} to ${singleLoopPercent(mostHomogeneous)}.`;
};
