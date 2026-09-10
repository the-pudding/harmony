<script module lang="ts">
	export type DecadeSeriesPoint = { decade: number; value: number };
	export type DecadeSeries = {
		label: string;
		color: string;
		points: DecadeSeriesPoint[];
	};
</script>

<script lang="ts">
	import { line as d3line, curveMonotoneX, scaleLinear, tickStep } from "d3";
	import {
		CHART_AXIS_LABEL_FILL,
		CHART_GRID_STROKE,
		CHART_HOVER_LINE_STROKE
	} from "../define-chord-progression/constants.js";

	type Props = {
		series: DecadeSeries[];
		title: string;
		description?: string;
		// Defaults preserve this chart's original percentage-of-a-decade use
		// (0-100%, y-axis labeled "N%"). Pass overrides for plain-count series
		// like "avg distinct chords per song" where values aren't percentages
		// and a 10-unit minimum axis height would flatten the real data.
		formatValue?: (value: number) => string;
		yMaxBaseline?: number;
	};

	const {
		series,
		title,
		description,
		formatValue = (value: number) => `${Math.round(value)}%`,
		yMaxBaseline = 10
	}: Props = $props();

	const MARGIN_LEFT = 38;
	const MARGIN_RIGHT = 16;
	const MARGIN_TOP = 12;
	const MARGIN_BOTTOM = 26;
	const CHART_HEIGHT = 220;
	const DOT_RADIUS = 2.5;
	const HOVER_DOT_RADIUS = 4;
	const LINE_STROKE_WIDTH = 1.75;
	const DECADE_PADDING = 3;
	const Y_TICK_COUNT = 5;
	const TOOLTIP_OFFSET_X = 12;
	const TOOLTIP_OFFSET_Y = -8;

	let containerWidth = $state(0);
	let hoveredDecade = $state<number | null>(null);
	let tooltipPosition = $state<{ x: number; y: number } | null>(null);

	const allDecades = $derived(
		[...new Set(series.flatMap((s) => s.points.map((p) => p.decade)))].sort(
			(a, b) => a - b
		)
	);

	const decadeDomain = $derived(
		allDecades.length === 0
			? ([0, 1] as [number, number])
			: ([
					allDecades[0] - DECADE_PADDING,
					allDecades[allDecades.length - 1] + DECADE_PADDING
				] as [number, number])
	);

	const yMax = $derived(
		Math.max(...series.flatMap((s) => s.points.map((p) => p.value)), yMaxBaseline)
	);

	const plotWidth = $derived(
		Math.max(containerWidth - MARGIN_LEFT - MARGIN_RIGHT, 0)
	);
	const plotHeight = CHART_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

	const xScale = $derived(
		scaleLinear().domain(decadeDomain).range([0, plotWidth])
	);
	const yScale = $derived(
		scaleLinear().domain([0, yMax]).range([plotHeight, 0])
	);

	const xTicks = $derived(
		allDecades.map((decade) => ({ decade, x: xScale(decade) }))
	);

	const yTicks = $derived.by(() => {
		const step = tickStep(0, yMax, Y_TICK_COUNT);
		const ticks: number[] = [];
		for (let value = 0; value <= yMax; value += step) ticks.push(value);
		const last = ticks[ticks.length - 1];
		// Skip appending yMax when it would land too close to the previous
		// tick's label and visually overlap it.
		if (last !== yMax && yMax - last >= step * 0.4) ticks.push(yMax);
		return ticks;
	});

	const linePathFor = (points: DecadeSeriesPoint[]): string => {
		if (plotWidth <= 0 || points.length === 0) return "";
		const sorted = [...points].sort((a, b) => a.decade - b.decade);
		return (
			d3line<DecadeSeriesPoint>()
				.x((p) => xScale(p.decade))
				.y((p) => yScale(p.value))
				.curve(curveMonotoneX)(sorted) ?? ""
		);
	};

	function handlePointerMove(event: PointerEvent) {
		if (plotWidth <= 0 || allDecades.length === 0) return;
		const svg = event.currentTarget as SVGSVGElement;
		const bounds = svg.getBoundingClientRect();
		const relativeX = event.clientX - bounds.left - MARGIN_LEFT;
		const decade = xScale.invert(Math.min(Math.max(relativeX, 0), plotWidth));
		hoveredDecade = allDecades.reduce(
			(closest, candidate) =>
				Math.abs(candidate - decade) < Math.abs(closest - decade)
					? candidate
					: closest,
			allDecades[0]
		);
		tooltipPosition = {
			x: event.clientX - bounds.left,
			y: event.clientY - bounds.top
		};
	}

	function clearHover() {
		hoveredDecade = null;
		tooltipPosition = null;
	}

	const hoveredValues = $derived(
		hoveredDecade === null
			? []
			: series.map((s) => ({
					label: s.label,
					color: s.color,
					value: s.points.find((p) => p.decade === hoveredDecade)?.value ?? null
				}))
	);
</script>

<div class="cadence-chart-block">
	<div class="cadence-chart-header">
		<h3 class="cadence-chart-title">{title}</h3>
		{#if description}
			<p class="cadence-chart-description">{description}</p>
		{/if}
	</div>

	<div class="legend">
		{#each series as s (s.label)}
			<span class="legend-item">
				<span class="legend-swatch" style:background={s.color}></span>
				{s.label}
			</span>
		{/each}
	</div>

	<div class="chart" bind:clientWidth={containerWidth}>
		{#if allDecades.length === 0}
			<div class="empty">Not enough dated sections to chart.</div>
		{:else if plotWidth > 0}
			<svg
				width={containerWidth}
				height={CHART_HEIGHT}
				role="img"
				aria-label={title}
				onpointermove={handlePointerMove}
				onpointerleave={clearHover}
			>
				<g transform="translate({MARGIN_LEFT}, {MARGIN_TOP})">
					{#each yTicks as tick (tick)}
						<line
							class="grid-line"
							x1="0"
							x2={plotWidth}
							y1={yScale(tick)}
							y2={yScale(tick)}
							stroke={CHART_GRID_STROKE}
						/>
						<text
							class="axis-label y-axis-label"
							x="-8"
							y={yScale(tick)}
							text-anchor="end"
							fill={CHART_AXIS_LABEL_FILL}>{formatValue(tick)}</text
						>
					{/each}

					{#each xTicks as tick (tick.decade)}
						<text
							class="axis-label x-axis-label"
							x={tick.x}
							y={plotHeight + 16}
							text-anchor="middle"
							fill={CHART_AXIS_LABEL_FILL}>{tick.decade}s</text
						>
					{/each}

					{#if hoveredDecade !== null}
						<line
							class="hover-line"
							x1={xScale(hoveredDecade)}
							x2={xScale(hoveredDecade)}
							y1="0"
							y2={plotHeight}
							stroke={CHART_HOVER_LINE_STROKE}
						/>
					{/if}

					{#each series as s (s.label)}
						<path
							class="line"
							d={linePathFor(s.points)}
							fill="none"
							stroke={s.color}
							stroke-width={LINE_STROKE_WIDTH}
						/>
						{#each s.points as point (point.decade)}
							<circle
								cx={xScale(point.decade)}
								cy={yScale(point.value)}
								r={hoveredDecade === point.decade ? HOVER_DOT_RADIUS : DOT_RADIUS}
								fill={s.color}
								class="dot"
							/>
						{/each}
					{/each}
				</g>
			</svg>

			{#if hoveredDecade !== null && tooltipPosition}
				<div
					class="tooltip"
					style:left="{tooltipPosition.x + TOOLTIP_OFFSET_X}px"
					style:top="{tooltipPosition.y + TOOLTIP_OFFSET_Y}px"
				>
					<p class="tooltip-row tooltip-header">{hoveredDecade}s</p>
					{#each hoveredValues as hv (hv.label)}
						{#if hv.value !== null}
							<p class="tooltip-row">
								<span class="tooltip-swatch" style:background={hv.color}></span>
								{hv.label}
								<span class="tooltip-value">{formatValue(hv.value)}</span>
							</p>
						{/if}
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.cadence-chart-block {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.cadence-chart-header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.cadence-chart-title {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 600;
		color: #f4f4f5;
	}

	.cadence-chart-description {
		margin: 0;
		font-size: 0.7rem;
		line-height: 1.5;
		color: #a1a1aa;
		max-width: 42rem;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.875rem;
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.7rem;
		color: #d4d4d8;
	}

	.legend-swatch {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 9999px;
		flex-shrink: 0;
	}

	.chart {
		position: relative;
		width: 100%;
	}

	.empty {
		display: flex;
		align-items: center;
		height: 120px;
		font-size: 0.7rem;
		color: rgba(161, 161, 170, 0.5);
	}

	svg {
		display: block;
	}

	.axis-label {
		font-size: 0.65rem;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}

	.y-axis-label {
		dominant-baseline: middle;
	}

	.x-axis-label {
		dominant-baseline: hanging;
	}

	.hover-line {
		stroke-width: 1;
		pointer-events: none;
	}

	.line {
		pointer-events: none;
	}

	.dot {
		pointer-events: none;
	}

	.tooltip {
		position: absolute;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		background: rgba(9, 9, 11, 0.95);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.375rem;
		padding: 0.5rem 0.625rem;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		pointer-events: none;
		z-index: 2;
		white-space: nowrap;
	}

	.tooltip-row {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.65rem;
		color: #d4d4d8;
	}

	.tooltip-header {
		color: #f4f4f5;
		font-weight: 700;
	}

	.tooltip-swatch {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		flex-shrink: 0;
	}

	.tooltip-value {
		margin-left: auto;
		font-weight: 700;
		color: #f4f4f5;
	}
</style>
