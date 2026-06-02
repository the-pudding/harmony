<script lang="ts">
	import { area, curveMonotoneX, line, max, scaleLinear, tickStep } from "d3";
	import { SvelteMap } from "svelte/reactivity";
	import { chordSearchDemoStore } from "../chordSearchDemoStore.svelte.js";
	import {
		MATCHING_SONGS_TIME_SERIES_AXIS_TICK_COUNT,
		MATCHING_SONGS_TIME_SERIES_EMPTY_MESSAGE,
		MATCHING_SONGS_TIME_SERIES_FILL_COLOR,
		MATCHING_SONGS_TIME_SERIES_HEIGHT_PX,
		MATCHING_SONGS_TIME_SERIES_MARGIN_BOTTOM_PX,
		MATCHING_SONGS_TIME_SERIES_MARGIN_LEFT_PX,
		MATCHING_SONGS_TIME_SERIES_MARGIN_RIGHT_PX,
		MATCHING_SONGS_TIME_SERIES_MARGIN_TOP_PX,
		MATCHING_SONGS_TIME_SERIES_STROKE_COLOR
	} from "../constants.js";

	type AnnualMatchPercentage = {
		year: number;
		count: number;
		percentage: number;
	};

	const PERCENT_BASELINE_MAX = 0.01;
	const AXIS_PERCENT_MAX_FRACTION_DIGITS = 1;
	const TOOLTIP_PERCENT_MAX_FRACTION_DIGITS = 2;

	const songs = $derived(chordSearchDemoStore.songs);
	const hasSearchChords = $derived(chordSearchDemoStore.searchChords.length > 0);
	const totalSongsByYear = $derived.by(() => {
		const totals = new SvelteMap<number, number>();
		for (const song of songs) {
			const { year } = song;
			if (year === undefined) continue;
			totals.set(year, (totals.get(year) ?? 0) + 1);
		}
		return totals;
	});
	const chartData = $derived.by(() =>
		chordSearchDemoStore.annualMatchCounts.map<AnnualMatchPercentage>((row) => {
			const totalSongs = totalSongsByYear.get(row.year) ?? 0;
			const denominator = hasSearchChords ? totalSongs : row.count;
			const percentage = denominator > 0 ? row.count / denominator : 0;
			return { year: row.year, count: row.count, percentage };
		})
	);
	const hasData = $derived(chartData.length > 0);

	let containerWidth = $state(0);
	let tooltip = $state<{
		year: number;
		count: number;
		percentage: number;
		x: number;
		y: number;
	} | null>(null);

	const plotWidth = $derived(
		Math.max(
			containerWidth -
				MATCHING_SONGS_TIME_SERIES_MARGIN_LEFT_PX -
				MATCHING_SONGS_TIME_SERIES_MARGIN_RIGHT_PX,
			0
		)
	);
	const plotHeight = $derived(
		MATCHING_SONGS_TIME_SERIES_HEIGHT_PX -
			MATCHING_SONGS_TIME_SERIES_MARGIN_TOP_PX -
			MATCHING_SONGS_TIME_SERIES_MARGIN_BOTTOM_PX
	);

	const yearExtent = $derived.by(() => {
		if (!hasData) return [0, 0] as const;
		return [chartData[0].year, chartData[chartData.length - 1].year] as const;
	});

	const maxPercentage = $derived(
		Math.max(max(chartData, (row) => row.percentage) ?? 0, PERCENT_BASELINE_MAX)
	);

	const xScale = $derived.by(() =>
		scaleLinear().domain(yearExtent).range([0, plotWidth])
	);

	const yScale = $derived.by(() =>
		scaleLinear().domain([0, maxPercentage]).range([plotHeight, 0])
	);

	const areaPath = $derived.by(() => {
		if (!hasData || plotWidth <= 0 || plotHeight <= 0) return "";

		return area<AnnualMatchPercentage>()
			.x((row) => xScale(row.year))
			.y0(plotHeight)
			.y1((row) => yScale(row.percentage))
			.curve(curveMonotoneX)(chartData);
	});

	const linePath = $derived.by(() => {
		if (!hasData || plotWidth <= 0 || plotHeight <= 0) return "";

		return line<AnnualMatchPercentage>()
			.x((row) => xScale(row.year))
			.y((row) => yScale(row.percentage))
			.curve(curveMonotoneX)(chartData);
	});

	const yearTicks = $derived.by(() => {
		if (!hasData) return [] as number[];

		const [minYear, maxYear] = yearExtent;
		const yearSpan = maxYear - minYear;
		const step = Math.max(
			1,
			Math.ceil(yearSpan / MATCHING_SONGS_TIME_SERIES_AXIS_TICK_COUNT)
		);
		const ticks: number[] = [];

		for (let year = minYear; year <= maxYear; year += step) {
			ticks.push(year);
		}

		if (ticks[ticks.length - 1] !== maxYear) {
			ticks.push(maxYear);
		}

		return ticks;
	});

	const percentAxisLabelFormatter = new Intl.NumberFormat("en-US", {
		style: "percent",
		maximumFractionDigits: AXIS_PERCENT_MAX_FRACTION_DIGITS
	});
	const tooltipPercentFormatter = new Intl.NumberFormat("en-US", {
		style: "percent",
		maximumFractionDigits: TOOLTIP_PERCENT_MAX_FRACTION_DIGITS
	});

	const percentageTicks = $derived.by(() => {
		const step = tickStep(
			0,
			maxPercentage,
			MATCHING_SONGS_TIME_SERIES_AXIS_TICK_COUNT
		);
		const ticks: number[] = [];

		for (let percentage = 0; percentage <= maxPercentage; percentage += step) {
			ticks.push(percentage);
		}

		if (ticks[ticks.length - 1] !== maxPercentage) {
			ticks.push(maxPercentage);
		}

		return ticks;
	});

	const nearestRow = (
		clientX: number,
		svgLeft: number
	): AnnualMatchPercentage | null => {
		if (!hasData || plotWidth <= 0) return null;

		const relativeX =
			clientX - svgLeft - MATCHING_SONGS_TIME_SERIES_MARGIN_LEFT_PX;
		const year = xScale.invert(Math.min(Math.max(relativeX, 0), plotWidth));

		return chartData.reduce<AnnualMatchPercentage | null>((closest, row) => {
			if (!closest) return row;
			return Math.abs(row.year - year) < Math.abs(closest.year - year)
				? row
				: closest;
		}, null);
	};

	const onPointerMove = (event: PointerEvent) => {
		const svg = event.currentTarget as SVGSVGElement;
		const bounds = svg.getBoundingClientRect();
		const row = nearestRow(event.clientX, bounds.left);
		if (!row) {
			tooltip = null;
			return;
		}

		tooltip = {
			year: row.year,
			count: row.count,
			percentage: row.percentage,
			x: event.clientX - bounds.left,
			y: event.clientY - bounds.top
		};
	};

	const hideTooltip = () => {
		tooltip = null;
	};
</script>

<section class="time-series-section">
	{#if hasData}
		<div
			class="chart-wrap"
			bind:clientWidth={containerWidth}
			style:height="{MATCHING_SONGS_TIME_SERIES_HEIGHT_PX}px"
		>
			{#if plotWidth > 0}
				<svg
					class="chart"
					width={containerWidth}
					height={MATCHING_SONGS_TIME_SERIES_HEIGHT_PX}
					role="img"
					aria-label="Matching songs by release year"
					onpointermove={onPointerMove}
					onpointerleave={hideTooltip}
				>
					<g
						transform="translate({MATCHING_SONGS_TIME_SERIES_MARGIN_LEFT_PX}, {MATCHING_SONGS_TIME_SERIES_MARGIN_TOP_PX})"
					>
						{#each percentageTicks as percentage (percentage)}
							<line
								class="grid-line"
								x1="0"
								x2={plotWidth}
								y1={yScale(percentage)}
								y2={yScale(percentage)}
							/>
							<text
								class="axis-label y-axis-label"
								x="-8"
								y={yScale(percentage)}
								text-anchor="end"
							>
								{percentAxisLabelFormatter.format(percentage)}
							</text>
						{/each}

						<path
							class="area"
							d={areaPath}
							fill={MATCHING_SONGS_TIME_SERIES_FILL_COLOR}
						/>
						<path
							class="line"
							d={linePath}
							fill="none"
							stroke={MATCHING_SONGS_TIME_SERIES_STROKE_COLOR}
						/>

						{#each yearTicks as year (year)}
							<text
								class="axis-label x-axis-label"
								x={xScale(year)}
								y={plotHeight + 16}
								text-anchor="middle"
							>
								{year}
							</text>
						{/each}
					</g>
				</svg>

				{#if tooltip}
					<div
						class="tooltip"
						style:left="{tooltip.x + 12}px"
						style:top="{tooltip.y - 8}px"
					>
						{tooltip.year}: {tooltipPercentFormatter.format(tooltip.percentage)}
					</div>
				{/if}
			{/if}
		</div>
	{:else}
		<p class="empty">{MATCHING_SONGS_TIME_SERIES_EMPTY_MESSAGE}</p>
	{/if}
</section>

<style>
	.time-series-section {
		width: 100%;
		min-width: 0;
	}

	.chart-wrap {
		position: relative;
		width: 100%;
		border: 1px solid rgba(39, 39, 42, 0.8);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.4);
		overflow: hidden;
	}

	.chart {
		display: block;
	}

	.grid-line {
		stroke: rgba(255, 255, 255, 0.06);
		stroke-width: 1;
	}

	.area {
		opacity: 0.35;
	}

	.line {
		stroke-width: 2;
	}

	.axis-label {
		fill: #71717a;
		font-size: 0.625rem;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}

	.y-axis-label {
		dominant-baseline: middle;
	}

	.x-axis-label {
		dominant-baseline: hanging;
	}

	.empty {
		font-size: 0.75rem;
		color: #71717a;
		margin: 0;
		font-style: italic;
	}

	.tooltip {
		position: absolute;
		pointer-events: none;
		background: rgba(24, 24, 27, 0.95);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.25rem;
		padding: 0.375rem 0.5rem;
		font-size: 0.6875rem;
		color: #e4e4e7;
		white-space: nowrap;
		z-index: 2;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}
</style>
