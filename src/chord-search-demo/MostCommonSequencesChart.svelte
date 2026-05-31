<script lang="ts">
	import { scaleBand, scaleLinear } from "d3";
	import { chordSearchDemoStore } from "./chordSearchDemoStore.svelte.js";
	import {
		FOUR_CHORDS_PROGRESSION_LABEL,
		SEQUENCE_CHART_BAR_HEIGHT_PX,
		SEQUENCE_CHART_EMPTY_MESSAGE,
		SEQUENCE_CHART_FALLBACK_BAR_COLOR,
		SEQUENCE_CHART_HIGHLIGHT_COLOR,
		SEQUENCE_CHART_LABEL_WIDTH_PX,
		SEQUENCE_CHART_LENGTH_COLORS,
		SEQUENCE_CHART_MARGIN_BOTTOM_PX,
		SEQUENCE_CHART_MARGIN_LEFT_PX,
		SEQUENCE_CHART_MARGIN_RIGHT_PX,
		SEQUENCE_CHART_MARGIN_TOP_PX,
		SEQUENCE_CHART_TOP_N
	} from "./constants.js";

	const chartData = $derived(chordSearchDemoStore.sequenceChartData);
	const hasData = $derived(chartData.length > 0);

	const chartHeight = $derived(
		SEQUENCE_CHART_TOP_N * SEQUENCE_CHART_BAR_HEIGHT_PX +
			SEQUENCE_CHART_MARGIN_TOP_PX +
			SEQUENCE_CHART_MARGIN_BOTTOM_PX
	);
	const chartWidth = $derived(SEQUENCE_CHART_LABEL_WIDTH_PX + 480);

	const plotWidth = $derived(
		chartWidth - SEQUENCE_CHART_LABEL_WIDTH_PX - SEQUENCE_CHART_MARGIN_LEFT_PX - SEQUENCE_CHART_MARGIN_RIGHT_PX
	);

	const yScale = $derived(
		scaleBand<string>()
			.domain(chartData.map((row) => row.label))
			.range([
				SEQUENCE_CHART_MARGIN_TOP_PX,
				chartHeight - SEQUENCE_CHART_MARGIN_BOTTOM_PX
			])
			.padding(0.2)
	);

	const xScale = $derived(
		scaleLinear()
			.domain([0, Math.max(...chartData.map((row) => row.occurrences), 1)])
			.range([0, plotWidth])
			.nice()
	);

	const xTicks = $derived(xScale.ticks(5));

	const barColor = (label: string, length: number) =>
		label === FOUR_CHORDS_PROGRESSION_LABEL
			? SEQUENCE_CHART_HIGHLIGHT_COLOR
			: (SEQUENCE_CHART_LENGTH_COLORS[length] ?? SEQUENCE_CHART_FALLBACK_BAR_COLOR);

	let tooltip = $state<{
		label: string;
		occurrences: number;
		songCount: number;
		length: number;
		x: number;
		y: number;
	} | null>(null);

	const showTooltip = (
		event: MouseEvent,
		row: (typeof chartData)[number]
	) => {
		tooltip = {
			label: row.label,
			occurrences: row.occurrences,
			songCount: row.songCount,
			length: row.length,
			x: event.offsetX,
			y: event.offsetY
		};
	};

	const hideTooltip = () => {
		tooltip = null;
	};
</script>

<section class="chart-section">
	<h2 class="chart-title">Most common chord sequences (any length)</h2>

	{#if !hasData}
		<p class="empty">{SEQUENCE_CHART_EMPTY_MESSAGE}</p>
	{:else}
		<div class="chart-wrap" style:height="{chartHeight}px">
			<svg
				class="chart"
				width={chartWidth}
				height={chartHeight}
				role="img"
				aria-label="Horizontal bar chart of most common chord sequences"
			>
				<g transform="translate({SEQUENCE_CHART_LABEL_WIDTH_PX + SEQUENCE_CHART_MARGIN_LEFT_PX}, 0)">
					{#each xTicks as tick (tick)}
						<g transform="translate({xScale(tick)}, 0)">
							<line
								y1={SEQUENCE_CHART_MARGIN_TOP_PX}
								y2={chartHeight - SEQUENCE_CHART_MARGIN_BOTTOM_PX}
								class="grid-line"
							/>
							<text
								y={chartHeight - SEQUENCE_CHART_MARGIN_BOTTOM_PX + 16}
								class="axis-label"
								text-anchor="middle"
							>
								{tick.toLocaleString()}
							</text>
						</g>
					{/each}

					{#each chartData as row (row.label)}
						{@const y = yScale(row.label) ?? 0}
						{@const barHeight = yScale.bandwidth()}
						{@const barWidth = xScale(row.occurrences)}
						<g
							role="button"
							tabindex="-1"
							aria-label="{row.occurrences.toLocaleString()} occurrences in {row.songCount.toLocaleString()} songs (length {row.length})"
							onmouseenter={(event) => showTooltip(event, row)}
							onmousemove={(event) => showTooltip(event, row)}
							onmouseleave={hideTooltip}
						>
							<rect
								x={0}
								{y}
								width={barWidth}
								height={barHeight}
								fill={barColor(row.label, row.length)}
								rx={3}
								class="bar"
							/>
						</g>
					{/each}
				</g>

				{#each chartData as row (row.label)}
					{@const y = (yScale(row.label) ?? 0) + yScale.bandwidth() / 2}
					<text
						x={SEQUENCE_CHART_LABEL_WIDTH_PX - 8}
						{y}
						class="row-label"
						text-anchor="end"
						dominant-baseline="middle"
					>
						{row.label}
					</text>
				{/each}
			</svg>

			{#if tooltip}
				<div
					class="tooltip"
					style:left="{tooltip.x + 12}px"
					style:top="{tooltip.y - 8}px"
				>
					{tooltip.occurrences.toLocaleString()} occurrences in {tooltip.songCount.toLocaleString()} songs (length {tooltip.length})
				</div>
			{/if}
		</div>
	{/if}
</section>

<style>
	.chart-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
	}

	.chart-title {
		font-size: 1.75rem;
		font-weight: 600;
		line-height: 1.2;
		color: #f4f4f5;
		margin: 0;
		letter-spacing: -0.02em;
	}

	.empty {
		font-size: 0.875rem;
		color: #71717a;
		margin: 0;
	}

	.chart-wrap {
		position: relative;
		width: 100%;
		overflow-x: auto;
	}

	.chart {
		display: block;
	}

	.grid-line {
		stroke: rgba(255, 255, 255, 0.06);
		stroke-width: 1;
	}

	.axis-label {
		fill: #555555;
		font-size: 0.6875rem;
		font-family: inherit;
	}

	.row-label {
		fill: #cccccc;
		font-size: 0.6875rem;
		font-family: inherit;
	}

	.bar {
		cursor: default;
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
	}
</style>
