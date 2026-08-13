<script lang="ts">
	import { curveMonotoneX, line as d3line, scaleLinear } from "d3";
	import type { ChordCoverageAnalysis, ChordCoverageStep } from "./chordCoverage.js";

	type Props = {
		analysis: ChordCoverageAnalysis;
	};

	const { analysis }: Props = $props();

	const ACCENT_COLOR = "#6366f1";
	const MARGIN_LEFT = 34;
	const MARGIN_RIGHT = 16;
	const MARGIN_TOP = 12;
	const MARGIN_BOTTOM = 26;
	const CHART_HEIGHT = 220;
	const DOT_RADIUS = 3;
	const HOVER_DOT_RADIUS = 4.5;
	const Y_TICKS = [0, 25, 50, 75, 100];

	let containerWidth = $state(0);
	let hoveredChordCount = $state<number | null>(null);

	const plotWidth = $derived(
		Math.max(containerWidth - MARGIN_LEFT - MARGIN_RIGHT, 0)
	);
	const plotHeight = CHART_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

	const xDomain = $derived([1, Math.max(analysis.totalDistinctChordCount, 2)]);
	const xScale = $derived(scaleLinear().domain(xDomain).range([0, plotWidth]));
	const yScale = $derived(scaleLinear().domain([0, 100]).range([plotHeight, 0]));

	const xTicks = $derived.by(() => {
		const max = analysis.totalDistinctChordCount;
		const step = Math.max(1, Math.round(max / 8));
		const ticks: number[] = [];
		for (let n = 1; n <= max; n += step) ticks.push(n);
		if (ticks[ticks.length - 1] !== max) ticks.push(max);
		return ticks;
	});

	const linePath = $derived.by(() => {
		if (plotWidth <= 0 || analysis.steps.length === 0) return "";
		return d3line<ChordCoverageStep>()
			.x((step) => xScale(step.chordCount))
			.y((step) => yScale(step.cumulativeCoveredPercent))
			.curve(curveMonotoneX)(analysis.steps);
	});

	const areaPath = $derived.by(() => {
		if (plotWidth <= 0 || analysis.steps.length === 0) return "";
		return (
			d3line<ChordCoverageStep>()
				.x((step) => xScale(step.chordCount))
				.y((step) => yScale(step.cumulativeCoveredPercent))
				.curve(curveMonotoneX)(analysis.steps) +
			`L${xScale(analysis.steps[analysis.steps.length - 1].chordCount)},${plotHeight} L${xScale(1)},${plotHeight} Z`
		);
	});

	const thresholdStep = $derived(
		analysis.steps.find((step) => step.chordCount === analysis.chordsForThreshold) ?? null
	);

	const hoveredStep = $derived(
		hoveredChordCount === null
			? null
			: (analysis.steps.find((step) => step.chordCount === hoveredChordCount) ?? null)
	);

	function handlePointerMove(event: PointerEvent) {
		if (plotWidth <= 0 || analysis.steps.length === 0) return;
		const svg = event.currentTarget as SVGSVGElement;
		const bounds = svg.getBoundingClientRect();
		const relativeX = event.clientX - bounds.left - MARGIN_LEFT;
		const chordCount = xScale.invert(Math.min(Math.max(relativeX, 0), plotWidth));
		hoveredChordCount = analysis.steps.reduce(
			(closest, step) =>
				Math.abs(step.chordCount - chordCount) < Math.abs(closest - chordCount)
					? step.chordCount
					: closest,
			analysis.steps[0].chordCount
		);
	}

	function clearHover() {
		hoveredChordCount = null;
	}
</script>

<div class="chart-wrap" bind:clientWidth={containerWidth}>
	{#if plotWidth > 0 && analysis.steps.length > 0}
		<svg
			width={containerWidth}
			height={CHART_HEIGHT}
			role="img"
			aria-label="Cumulative share of songs playable as chords are learned"
			onpointermove={handlePointerMove}
			onpointerleave={clearHover}
		>
			<g transform="translate({MARGIN_LEFT}, {MARGIN_TOP})">
				{#each Y_TICKS as tick (tick)}
					<line
						class="grid-line"
						x1="0"
						x2={plotWidth}
						y1={yScale(tick)}
						y2={yScale(tick)}
					/>
					<text
						class="axis-label y-axis-label"
						x="-8"
						y={yScale(tick)}
						text-anchor="end">{tick}%</text
					>
				{/each}

				{#each xTicks as tick (tick)}
					<text
						class="axis-label x-axis-label"
						x={xScale(tick)}
						y={plotHeight + 16}
						text-anchor="middle">{tick}</text
					>
				{/each}

				<line
					class="threshold-line"
					x1="0"
					x2={plotWidth}
					y1={yScale(analysis.thresholdPercent)}
					y2={yScale(analysis.thresholdPercent)}
				/>
				<text
					class="threshold-label"
					x={plotWidth}
					y={yScale(analysis.thresholdPercent) - 4}
					text-anchor="end">{analysis.thresholdPercent}%</text
				>

				{#if thresholdStep}
					<line
						class="threshold-line"
						x1={xScale(thresholdStep.chordCount)}
						x2={xScale(thresholdStep.chordCount)}
						y1={yScale(thresholdStep.cumulativeCoveredPercent)}
						y2={plotHeight}
					/>
					<text
						class="threshold-label"
						x={xScale(thresholdStep.chordCount)}
						y={plotHeight + 16}
						text-anchor="middle">{thresholdStep.chordCount}</text
					>
				{/if}

				{#if hoveredChordCount !== null}
					<line
						class="hover-line"
						x1={xScale(hoveredChordCount)}
						x2={xScale(hoveredChordCount)}
						y1="0"
						y2={plotHeight}
					/>
				{/if}

				<path class="area" d={areaPath} fill={ACCENT_COLOR} />
				<path class="line" d={linePath} fill="none" stroke={ACCENT_COLOR} />

				{#each analysis.steps as step (step.chordCount)}
					<circle
						cx={xScale(step.chordCount)}
						cy={yScale(step.cumulativeCoveredPercent)}
						r={hoveredChordCount === step.chordCount ? HOVER_DOT_RADIUS : DOT_RADIUS}
						fill={ACCENT_COLOR}
						class="dot"
					/>
				{/each}
			</g>
		</svg>

		{#if hoveredStep}
			<div class="tooltip">
				<p class="tooltip-title">
					{hoveredStep.chordCount} chords known · +{hoveredStep.chord}
				</p>
				<p class="tooltip-row">
					+{hoveredStep.newlyCoveredSongCount} newly playable songs
				</p>
				<p class="tooltip-row">
					{hoveredStep.cumulativeCoveredSongCount}/{analysis.totalSongCount} playable
					({Math.round(hoveredStep.cumulativeCoveredPercent)}%)
				</p>
			</div>
		{/if}
	{/if}
</div>

<style>
	.chart-wrap {
		position: relative;
		width: 100%;
		border: 1px solid rgba(39, 39, 42, 0.8);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.4);
		overflow: hidden;
	}

	svg {
		display: block;
	}

	.grid-line {
		stroke: rgba(255, 255, 255, 0.06);
		stroke-width: 1;
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

	.threshold-line {
		stroke: rgba(248, 113, 113, 0.45);
		stroke-width: 1;
		stroke-dasharray: 3 3;
		pointer-events: none;
	}

	.threshold-label {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.625rem;
		fill: rgba(252, 165, 165, 0.9);
	}

	.hover-line {
		stroke: rgba(255, 255, 255, 0.25);
		stroke-width: 1;
		pointer-events: none;
	}

	.area {
		opacity: 0.18;
	}

	.line {
		stroke-width: 2;
	}

	.dot {
		pointer-events: none;
		transition: r 0.1s ease;
	}

	.tooltip {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.1875rem;
		background: rgba(9, 9, 11, 0.95);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.375rem;
		padding: 0.5rem 0.625rem;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		pointer-events: none;
		z-index: 2;
	}

	.tooltip-title {
		margin: 0 0 0.125rem;
		font-size: 0.65rem;
		font-weight: 600;
		color: #d4d4d8;
	}

	.tooltip-row {
		margin: 0;
		font-size: 0.625rem;
		color: #a1a1aa;
		white-space: nowrap;
	}
</style>
