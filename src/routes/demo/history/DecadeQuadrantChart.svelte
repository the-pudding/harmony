<script lang="ts">
	import { scaleLinear } from "d3";
	import {
		CHART_AXIS_LABEL_FILL,
		CHART_GRID_STROKE
	} from "../define-chord-progression/constants.js";
	import type { DecadeSignature } from "./decadeSignatures.js";

	type Props = {
		signatures: DecadeSignature[];
	};

	const { signatures }: Props = $props();

	const MARGIN_LEFT = 42;
	const MARGIN_RIGHT = 20;
	const MARGIN_TOP = 16;
	const MARGIN_BOTTOM = 30;
	const CHART_HEIGHT = 320;
	const DOT_RADIUS = 4;
	const HOVER_DOT_RADIUS = 6;
	const LABEL_OFFSET_X = 7;
	const X_MAX_BASELINE = 1; // percent
	const Y_MAX_BASELINE = 1; // distinctiveness (x)
	const TOOLTIP_OFFSET_X = 12;
	const TOOLTIP_OFFSET_Y = -8;

	let containerWidth = $state(0);
	let hoveredName = $state<string | null>(null);
	let tooltipPosition = $state<{ x: number; y: number } | null>(null);

	type Point = { name: string; volumePercent: number; distinctiveness: number; count: number };

	const points = $derived(
		signatures.map(
			(s): Point => ({
				name: s.name,
				volumePercent: s.shareInDecade * 100,
				distinctiveness: s.distinctiveness,
				count: s.count
			})
		)
	);

	const plotWidth = $derived(Math.max(containerWidth - MARGIN_LEFT - MARGIN_RIGHT, 0));
	const plotHeight = CHART_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

	const xMax = $derived(
		Math.max(...points.map((p) => p.volumePercent), X_MAX_BASELINE) * 1.15
	);
	const yMax = $derived(
		Math.max(...points.map((p) => p.distinctiveness), Y_MAX_BASELINE) * 1.15
	);

	const xScale = $derived(scaleLinear().domain([0, xMax]).range([0, plotWidth]));
	const yScale = $derived(scaleLinear().domain([0, yMax]).range([plotHeight, 0]));

	// A data-driven "typical volume" reference for this decade's own top 10 —
	// separate from the fixed distinctiveness=1x baseline, since what counts
	// as "high volume" varies decade to decade.
	const medianVolumePercent = $derived.by(() => {
		if (points.length === 0) return 0;
		const sorted = [...points.map((p) => p.volumePercent)].sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
	});

	const xTicks = $derived(xScale.ticks(5));
	const yTicks = $derived(yScale.ticks(5));

	const hoveredPoint = $derived(points.find((p) => p.name === hoveredName) ?? null);

	const HOVER_RADIUS_PX = 16;

	function handlePointerMove(event: PointerEvent) {
		if (plotWidth <= 0 || points.length === 0) return;
		const svg = event.currentTarget as SVGSVGElement;
		const bounds = svg.getBoundingClientRect();
		const relativeX = event.clientX - bounds.left - MARGIN_LEFT;
		const relativeY = event.clientY - bounds.top - MARGIN_TOP;

		let closest: Point | null = null;
		let closestDistance = Infinity;
		for (const point of points) {
			const dx = xScale(point.volumePercent) - relativeX;
			const dy = yScale(point.distinctiveness) - relativeY;
			const distance = Math.hypot(dx, dy);
			if (distance < closestDistance) {
				closestDistance = distance;
				closest = point;
			}
		}

		hoveredName = closest && closestDistance <= HOVER_RADIUS_PX ? closest.name : null;
		tooltipPosition = hoveredName
			? { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
			: null;
	}

	function clearHover() {
		hoveredName = null;
		tooltipPosition = null;
	}
</script>

<div class="quadrant-chart-block">
	<div class="quadrant-chart-header">
		<h4 class="quadrant-chart-title">Volume vs. distinctiveness</h4>
		<p class="quadrant-chart-description">
			X-axis: how much of the decade's matched activity this progression
			accounts for. Y-axis: how over-represented it is compared to its own
			all-time average. The top-right — high volume <em>and</em> high distinctiveness
			— is where the real signatures sit; the top 3 above come from here.
		</p>
	</div>

	<div class="chart" bind:clientWidth={containerWidth}>
		{#if points.length === 0}
			<div class="empty">Not enough eligible progressions to plot.</div>
		{:else if plotWidth > 0}
			<svg
				width={containerWidth}
				height={CHART_HEIGHT}
				role="img"
				aria-label="Volume vs. distinctiveness"
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
							fill={CHART_AXIS_LABEL_FILL}>{tick}x</text
						>
					{/each}

					{#each xTicks as tick (tick)}
						<text
							class="axis-label x-axis-label"
							x={xScale(tick)}
							y={plotHeight + 16}
							text-anchor="middle"
							fill={CHART_AXIS_LABEL_FILL}>{tick}%</text
						>
					{/each}

					<line
						class="reference-line"
						x1="0"
						x2={plotWidth}
						y1={yScale(1)}
						y2={yScale(1)}
					/>
					<line
						class="reference-line"
						x1={xScale(medianVolumePercent)}
						x2={xScale(medianVolumePercent)}
						y1="0"
						y2={plotHeight}
					/>

					{#each points as point (point.name)}
						{@const isHovered = hoveredName === point.name}
						<circle
							cx={xScale(point.volumePercent)}
							cy={yScale(point.distinctiveness)}
							r={isHovered ? HOVER_DOT_RADIUS : DOT_RADIUS}
							class="dot"
							class:dimmed={hoveredName !== null && !isHovered}
						/>
						<text
							x={xScale(point.volumePercent) + LABEL_OFFSET_X}
							y={yScale(point.distinctiveness)}
							class="point-label"
							class:dimmed={hoveredName !== null && !isHovered}
							dominant-baseline="middle">{point.name}</text
						>
					{/each}
				</g>
			</svg>

			{#if hoveredPoint && tooltipPosition}
				<div
					class="tooltip"
					style:left="{tooltipPosition.x + TOOLTIP_OFFSET_X}px"
					style:top="{tooltipPosition.y + TOOLTIP_OFFSET_Y}px"
				>
					<p class="tooltip-row tooltip-header">{hoveredPoint.name}</p>
					<p class="tooltip-row">
						{hoveredPoint.volumePercent.toFixed(1)}% of decade's matches
					</p>
					<p class="tooltip-row">{hoveredPoint.distinctiveness.toFixed(2)}x more common here</p>
					<p class="tooltip-row">{hoveredPoint.count.toLocaleString()} matches</p>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.quadrant-chart-block {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.quadrant-chart-header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.quadrant-chart-title {
		margin: 0;
		font-size: 0.8125rem;
		font-weight: 600;
		color: #f4f4f5;
	}

	.quadrant-chart-description {
		margin: 0;
		font-size: 0.7rem;
		line-height: 1.5;
		color: #a1a1aa;
		max-width: 44rem;
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

	.reference-line {
		stroke: rgba(161, 161, 170, 0.35);
		stroke-width: 1;
		stroke-dasharray: 3 3;
	}

	.dot {
		fill: #6366f1;
		stroke: #09090b;
		stroke-width: 1;
		cursor: pointer;
		transition:
			r 0.1s ease,
			opacity 0.15s ease;
	}

	.dot.dimmed {
		opacity: 0.35;
	}

	.point-label {
		font-size: 0.65rem;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		fill: #d4d4d8;
		pointer-events: none;
		transition: opacity 0.15s ease;
	}

	.point-label.dimmed {
		opacity: 0.35;
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
		font-size: 0.65rem;
		color: #d4d4d8;
	}

	.tooltip-header {
		color: #f4f4f5;
		font-weight: 700;
	}
</style>
