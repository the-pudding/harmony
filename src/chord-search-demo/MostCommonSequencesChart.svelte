<script lang="ts">
	import { scaleBand, scaleLinear } from "d3";
	import { chordSearchDemoStore } from "./chordSearchDemoStore.svelte.js";
	import {
		FOUR_CHORDS_PROGRESSION_LABEL,
		SEQUENCE_CHART_AXIS_HEIGHT_PX,
		SEQUENCE_CHART_AXIS_TICK_Y_PX,
		SEQUENCE_CHART_BAR_HEIGHT_PX,
		SEQUENCE_CHART_CHORD_CELL_WIDTH_PX,
		SEQUENCE_CHART_CHORD_SEPARATOR,
		SEQUENCE_CHART_EMPTY_MESSAGE,
		SEQUENCE_CHART_FALLBACK_BAR_COLOR,
		SEQUENCE_CHART_HIGHLIGHT_COLOR,
		SEQUENCE_CHART_LENGTH_COLORS,
		SEQUENCE_CHART_LOADING_MESSAGE,
		SEQUENCE_CHART_MARGIN_BOTTOM_PX,
		SEQUENCE_CHART_MARGIN_LEFT_PX,
		SEQUENCE_CHART_MARGIN_RIGHT_PX,
		SEQUENCE_CHART_MARGIN_TOP_PX,
		SEQUENCE_CHART_PLOT_WIDTH_PX,
		SEQUENCE_CHART_VIEWPORT_HEIGHT_PX,
		VARIABLE_GRAM_MAX_LENGTH
	} from "./constants.js";

	const chartData = $derived(chordSearchDemoStore.sequenceChartData);
	const chartStatus = $derived(chordSearchDemoStore.sequenceChartStatus);
	const chartError = $derived(chordSearchDemoStore.sequenceChartError);
	const minNumChordsToCountAsAProgression = $derived(
		chordSearchDemoStore.minNumChordsToCountAsAProgression
	);
	const chartTitle = $derived(
		`Most common chord sequences (min length ${minNumChordsToCountAsAProgression})`
	);
	const isLoading = $derived(chartStatus === "loading");
	const hasData = $derived(chartData.length > 0);
	const showEmpty = $derived(chartStatus === "ready" && !hasData);
	const showChart = $derived(hasData);

	const parseLabelChords = (label: string) => label.split(SEQUENCE_CHART_CHORD_SEPARATOR);

	const labelWidth = $derived(
		VARIABLE_GRAM_MAX_LENGTH * SEQUENCE_CHART_CHORD_CELL_WIDTH_PX
	);

	const chartHeight = $derived(
		chartData.length * SEQUENCE_CHART_BAR_HEIGHT_PX +
			SEQUENCE_CHART_MARGIN_TOP_PX +
			SEQUENCE_CHART_MARGIN_BOTTOM_PX
	);
	const chartWidth = $derived(
		labelWidth + SEQUENCE_CHART_MARGIN_LEFT_PX + SEQUENCE_CHART_PLOT_WIDTH_PX + SEQUENCE_CHART_MARGIN_RIGHT_PX
	);

	const plotWidth = $derived(SEQUENCE_CHART_PLOT_WIDTH_PX);

	const plotOriginX = $derived(labelWidth + SEQUENCE_CHART_MARGIN_LEFT_PX);

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
	<h2 class="chart-title">{chartTitle}</h2>

	{#if chartError}
		<p class="error">{chartError}</p>
	{/if}

	{#if isLoading && !showChart}
		<p class="status">{SEQUENCE_CHART_LOADING_MESSAGE}</p>
	{:else if showEmpty}
		<p class="empty">{SEQUENCE_CHART_EMPTY_MESSAGE}</p>
	{:else if showChart}
		<div
			class="chart-wrap"
			class:is-loading={isLoading}
			style:height="{SEQUENCE_CHART_VIEWPORT_HEIGHT_PX}px"
		>
			<svg
				class="chart"
				width={chartWidth}
				height={chartHeight}
				role="img"
				aria-label="Horizontal bar chart of most common chord sequences"
				aria-busy={isLoading}
			>
				<g transform="translate({plotOriginX}, 0)">
					<line
						x1={0}
						x2={plotWidth}
						y1={SEQUENCE_CHART_AXIS_HEIGHT_PX}
						y2={SEQUENCE_CHART_AXIS_HEIGHT_PX}
						class="axis-line"
					/>

					{#each xTicks as tick (tick)}
						<g transform="translate({xScale(tick)}, 0)">
							<line
								y1={SEQUENCE_CHART_MARGIN_TOP_PX}
								y2={chartHeight - SEQUENCE_CHART_MARGIN_BOTTOM_PX}
								class="grid-line"
							/>
							<text
								y={SEQUENCE_CHART_AXIS_TICK_Y_PX}
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
					{@const chords = parseLabelChords(row.label)}
					<g class="row-label-group">
						{#each chords as chord, chordIndex (chordIndex)}
							<text
								x={chordIndex * SEQUENCE_CHART_CHORD_CELL_WIDTH_PX}
								{y}
								class="chord-token"
								text-anchor="start"
								dominant-baseline="middle"
							>
								{chord}
							</text>
							{#if chordIndex < chords.length - 1}
								<text
									x={(chordIndex + 1) * SEQUENCE_CHART_CHORD_CELL_WIDTH_PX - 10}
									{y}
									class="chord-separator"
									text-anchor="end"
									dominant-baseline="middle"
								>
									{SEQUENCE_CHART_CHORD_SEPARATOR}
								</text>
							{/if}
						{/each}
					</g>
				{/each}
			</svg>

			{#if isLoading}
				<div class="loading-overlay">{SEQUENCE_CHART_LOADING_MESSAGE}</div>
			{/if}

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
		min-width: 0;
	}

	.chart-title {
		font-size: 1.75rem;
		font-weight: 600;
		line-height: 1.2;
		color: #f4f4f5;
		margin: 0;
		letter-spacing: -0.02em;
	}

	.status,
	.empty {
		font-size: 0.875rem;
		color: #71717a;
		margin: 0;
	}

	.error {
		font-size: 0.875rem;
		color: #fca5a5;
		margin: 0;
	}

	.chart-wrap {
		position: relative;
		width: 100%;
		overflow: auto;
		border: 1px solid rgba(39, 39, 42, 0.8);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.4);
	}

	.chart-wrap.is-loading .chart {
		opacity: 0.45;
	}

	.chart {
		display: block;
		transition: opacity 0.2s ease-out;
	}

	.loading-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		color: #a1a1aa;
		pointer-events: none;
	}

	.axis-line {
		stroke: rgba(255, 255, 255, 0.12);
		stroke-width: 1;
	}

	.grid-line {
		stroke: rgba(255, 255, 255, 0.06);
		stroke-width: 1;
	}

	.axis-label {
		fill: #555555;
		font-size: 0.6875rem;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}

	.row-label-group {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}

	.chord-token {
		fill: #cccccc;
		font-size: 0.6875rem;
		font-family: inherit;
	}

	.chord-separator {
		fill: #666666;
		font-size: 0.625rem;
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
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}
</style>
