<script lang="ts">
	import { area, curveMonotoneX, line as d3line, scaleLinear, tickStep } from "d3";
	import type { YearSharePoint } from "./shareByYear.js";

	type Props = {
		points: YearSharePoint[];
		width: number;
		height: number;
		color: string;
		title: string;
	};

	const { points, width, height, color, title }: Props = $props();

	const MARGIN_LEFT = 34;
	const MARGIN_RIGHT = 16;
	const MARGIN_TOP = 12;
	const MARGIN_BOTTOM = 26;
	const DOT_RADIUS = 1.5;
	const HOVER_DOT_RADIUS = 2.75;
	const LINE_STROKE_WIDTH = 1.5;
	const YEAR_PADDING = 0.5;
	const TICK_COUNT = 8;
	const Y_TICK_COUNT = 4;
	const Y_MAX_BASELINE = 1;
	const TOOLTIP_OFFSET_X = 12;
	const TOOLTIP_OFFSET_Y = -8;

	let hoveredYear = $state<number | null>(null);
	let tooltipPosition = $state<{ x: number; y: number } | null>(null);

	const plotWidth = $derived(Math.max(width - MARGIN_LEFT - MARGIN_RIGHT, 0));
	const plotHeight = $derived(Math.max(height - MARGIN_TOP - MARGIN_BOTTOM, 0));

	const yearDomain = $derived.by((): [number, number] | null => {
		if (points.length === 0) return null;
		return [points[0].year, points[points.length - 1].year];
	});

	const yMax = $derived(
		Math.max(...points.map((point) => point.sharePercent), Y_MAX_BASELINE)
	);

	const xScale = $derived(
		scaleLinear()
			.domain(
				yearDomain
					? [yearDomain[0] - YEAR_PADDING, yearDomain[1] + YEAR_PADDING]
					: [0, 1]
			)
			.range([0, plotWidth])
	);
	const yScale = $derived(scaleLinear().domain([0, yMax]).range([plotHeight, 0]));

	const xTicks = $derived(
		yearDomain === null
			? []
			: xScale
					.ticks(TICK_COUNT)
					.filter((tick) => Number.isInteger(tick))
					.map((tick) => ({ year: tick, x: xScale(tick) }))
	);

	const yTicks = $derived.by(() => {
		const step = tickStep(0, yMax, Y_TICK_COUNT);
		const ticks: number[] = [];
		for (let value = 0; value <= yMax; value += step) {
			ticks.push(value);
		}
		if (ticks[ticks.length - 1] !== yMax) ticks.push(yMax);
		return ticks;
	});

	const formatYTick = (value: number): string => {
		const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
		return `${rounded}%`;
	};

	const areaPath = $derived.by(() => {
		if (plotWidth <= 0 || points.length === 0) return "";
		return (
			area<YearSharePoint>()
				.x((p) => xScale(p.year))
				.y0(plotHeight)
				.y1((p) => yScale(p.sharePercent))
				.curve(curveMonotoneX)(points) ?? ""
		);
	});

	const linePath = $derived.by(() => {
		if (plotWidth <= 0 || points.length === 0) return "";
		return (
			d3line<YearSharePoint>()
				.x((p) => xScale(p.year))
				.y((p) => yScale(p.sharePercent))
				.curve(curveMonotoneX)(points) ?? ""
		);
	});

	const hoveredPoint = $derived(
		hoveredYear === null ? null : (points.find((p) => p.year === hoveredYear) ?? null)
	);

	function handlePointerMove(event: PointerEvent) {
		if (plotWidth <= 0 || points.length === 0) return;
		const svg = event.currentTarget as SVGSVGElement;
		const bounds = svg.getBoundingClientRect();
		const relativeX = event.clientX - bounds.left - MARGIN_LEFT;
		const year = xScale.invert(Math.min(Math.max(relativeX, 0), plotWidth));
		hoveredYear = points.reduce(
			(closest, point) =>
				Math.abs(point.year - year) < Math.abs(closest - year) ? point.year : closest,
			points[0].year
		);
		tooltipPosition = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
	}

	function clearHover() {
		hoveredYear = null;
		tooltipPosition = null;
	}
</script>

<div class="chart">
	{#if points.length > 0}
		<svg
			{width}
			{height}
			viewBox="0 0 {width} {height}"
			style="width: {width}px; height: {height}px;"
			role="img"
			aria-label={title}
			onpointermove={handlePointerMove}
			onpointerleave={clearHover}
		>
			<g transform="translate({MARGIN_LEFT}, {MARGIN_TOP})">
				{#each yTicks as tick (tick)}
					<line class="grid-line" x1="0" x2={plotWidth} y1={yScale(tick)} y2={yScale(tick)} />
					<text class="axis-label y-axis-label" x="-8" y={yScale(tick)} text-anchor="end"
						>{formatYTick(tick)}</text
					>
				{/each}

				{#each xTicks as tick (tick.year)}
					<text
						class="axis-label x-axis-label"
						x={tick.x}
						y={plotHeight + 16}
						text-anchor="middle">{tick.year}</text
					>
				{/each}

				{#if hoveredPoint}
					<line
						class="hover-line"
						x1={xScale(hoveredPoint.year)}
						x2={xScale(hoveredPoint.year)}
						y1="0"
						y2={plotHeight}
					/>
				{/if}

				<path class="area" d={areaPath} fill={color} fill-opacity="0.18" />
				<path class="line" d={linePath} fill="none" stroke={color} stroke-width={LINE_STROKE_WIDTH} />

				{#each points as point (point.year)}
					<circle
						cx={xScale(point.year)}
						cy={yScale(point.sharePercent)}
						r={hoveredYear === point.year ? HOVER_DOT_RADIUS : DOT_RADIUS}
						fill={color}
						class="dot"
					/>
				{/each}
			</g>
		</svg>

		{#if hoveredPoint && tooltipPosition}
			<div
				class="tooltip"
				style:left="{tooltipPosition.x + TOOLTIP_OFFSET_X}px"
				style:top="{tooltipPosition.y + TOOLTIP_OFFSET_Y}px"
			>
				<p class="tooltip-row">
					In <span class="tooltip-emphasis">{hoveredPoint.year}</span>
				</p>
				<p class="tooltip-row">
					<span class="tooltip-emphasis">{Math.round(hoveredPoint.sharePercent)}%</span> of songs
				</p>
			</div>
		{/if}
	{/if}
</div>

<style>
	.chart {
		position: relative;
	}

	svg {
		display: block;
		flex-shrink: 0;
	}

	.axis-label {
		font-size: 0.6rem;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		fill: rgba(63, 63, 70, 0.75);
	}

	.grid-line {
		stroke: rgba(0, 0, 0, 0.08);
		stroke-width: 1;
	}

	.y-axis-label {
		dominant-baseline: middle;
	}

	.x-axis-label {
		dominant-baseline: hanging;
	}

	.hover-line {
		stroke: rgba(0, 0, 0, 0.25);
		stroke-width: 1;
		pointer-events: none;
	}

	.dot {
		pointer-events: none;
		transition:
			r 0.1s ease,
			fill 0.15s ease;
	}

	.tooltip {
		position: absolute;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		background: rgba(255, 255, 255, 0.98);
		border: 1px solid rgba(0, 0, 0, 0.12);
		border-radius: 0.375rem;
		padding: 0.5rem 0.625rem;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		pointer-events: none;
		z-index: 2;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	}

	.tooltip-row {
		margin: 0;
		font-size: 0.625rem;
		color: #52525b;
		white-space: nowrap;
	}

	.tooltip-emphasis {
		font-weight: 700;
		color: #18181b;
	}
</style>
