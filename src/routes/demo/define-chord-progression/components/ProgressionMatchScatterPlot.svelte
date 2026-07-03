<script lang="ts">
	import type { ProgressionWithMatchStats } from "../progression-matching-logic/progressionMatchAnalysis.js";
	import ProgressionMatchButton from "./ProgressionMatchButton.svelte";

	type Props = {
		matches: ProgressionWithMatchStats[];
		activeProgression: string | null;
		onselect: (chordProgression: string) => void;
	};

	let { matches, activeProgression, onselect }: Props = $props();

	const CHART_HEIGHT = 160;
	const PAD_TOP = 12;
	const PAD_RIGHT = 16;
	const PAD_BOTTOM = 32;
	const PAD_LEFT = 36;
	const POINT_RADIUS = 5;
	const POINT_RADIUS_HOVERED = 7;
	const X_TICK_VALS = [0, 25, 50, 75, 100];
	const Y_TICK_COUNT = 4;

	let containerWidth = $state(0);
	let hoveredMatch = $state<ProgressionWithMatchStats | null>(null);
	let tooltipX = $state(0);
	let tooltipY = $state(0);

	const innerWidth = $derived(containerWidth - PAD_LEFT - PAD_RIGHT);
	const innerHeight = $derived(CHART_HEIGHT - PAD_TOP - PAD_BOTTOM);
	const maxMatchCount = $derived(Math.max(...matches.map((m) => m.matchCount), 1));

	const yTickVals = $derived.by(() => {
		const step = Math.max(1, Math.ceil(maxMatchCount / Y_TICK_COUNT));
		const vals: number[] = [];
		for (let v = 0; v <= maxMatchCount; v += step) vals.push(v);
		if (vals[vals.length - 1] !== maxMatchCount) vals.push(maxMatchCount);
		return [...new Set(vals)];
	});

	function handleMouseEnter(e: MouseEvent, match: ProgressionWithMatchStats) {
		hoveredMatch = match;
		positionTooltip(e);
	}

	function handleMouseMove(e: MouseEvent) {
		if (hoveredMatch) positionTooltip(e);
	}

	function positionTooltip(e: MouseEvent) {
		const container = (e.currentTarget as Element).closest(".scatter-wrap") as HTMLElement | null;
		if (!container) return;
		const rect = container.getBoundingClientRect();
		tooltipX = e.clientX - rect.left;
		tooltipY = e.clientY - rect.top;
	}
</script>

<div class="scatter-wrap" bind:clientWidth={containerWidth}>
	{#if hoveredMatch}
		<div class="tooltip" style:left="{tooltipX}px" style:top="{tooltipY}px">
			<ProgressionMatchButton
				match={hoveredMatch}
				active={activeProgression === hoveredMatch.chordProgression}
				borderColor={hoveredMatch.isCoreProgression
					? hoveredMatch.highlightPalette.border
					: undefined}
				{onselect}
			/>
		</div>
	{/if}

	{#if containerWidth > 0}
		<svg width={containerWidth} height={CHART_HEIGHT}>
			<!-- Y-axis gridlines and labels -->
			{#each yTickVals as tick (tick)}
				{@const y = PAD_TOP + innerHeight - (tick / maxMatchCount) * innerHeight}
				<line class="gridline" x1={PAD_LEFT} y1={y} x2={PAD_LEFT + innerWidth} y2={y} />
				<text class="axis-label" x={PAD_LEFT - 6} {y} text-anchor="end" dominant-baseline="middle"
					>{tick}</text
				>
			{/each}

			<!-- X-axis gridlines and labels -->
			{#each X_TICK_VALS as tick (tick)}
				{@const x = PAD_LEFT + (tick / 100) * innerWidth}
				<line class="gridline" x1={x} y1={PAD_TOP} x2={x} y2={PAD_TOP + innerHeight} />
				<text class="axis-label" {x} y={PAD_TOP + innerHeight + 14} text-anchor="middle"
					>{tick}%</text
				>
			{/each}

			<!-- Axis borders -->
			<line
				class="axis-line"
				x1={PAD_LEFT}
				y1={PAD_TOP}
				x2={PAD_LEFT}
				y2={PAD_TOP + innerHeight}
			/>
			<line
				class="axis-line"
				x1={PAD_LEFT}
				y1={PAD_TOP + innerHeight}
				x2={PAD_LEFT + innerWidth}
				y2={PAD_TOP + innerHeight}
			/>

			<!-- Axis titles -->
			<text
				class="axis-title"
				x={PAD_LEFT + innerWidth / 2}
				y={CHART_HEIGHT - 2}
				text-anchor="middle">coverage %</text
			>
			<text
				class="axis-title"
				x={8}
				y={PAD_TOP + innerHeight / 2}
				text-anchor="middle"
				transform="rotate(-90, 8, {PAD_TOP + innerHeight / 2})">times</text
			>

			<!-- Data points -->
			{#each matches as match (match.chordProgression)}
				{@const cx = PAD_LEFT + (match.coveragePercent / 100) * innerWidth}
				{@const cy = PAD_TOP + innerHeight - (match.matchCount / maxMatchCount) * innerHeight}
				{@const isHovered = hoveredMatch?.chordProgression === match.chordProgression}
				{@const isActive = activeProgression === match.chordProgression}
				<circle
					{cx}
					{cy}
					r={isHovered ? POINT_RADIUS_HOVERED : POINT_RADIUS}
					fill={match.highlightPalette.border}
					stroke={isActive ? "rgba(255,255,255,0.7)" : "transparent"}
					stroke-width="2"
					class="data-point"
					onmouseenter={(e) => handleMouseEnter(e, match)}
					onmousemove={handleMouseMove}
					onmouseleave={() => {
						hoveredMatch = null;
					}}
				/>
			{/each}
		</svg>
	{/if}
</div>

<style>
	.scatter-wrap {
		position: relative;
		width: 100%;
		margin-bottom: 0.75rem;
	}

	.gridline {
		stroke: rgba(255, 255, 255, 0.07);
		stroke-width: 1;
	}

	.axis-line {
		stroke: rgba(255, 255, 255, 0.15);
		stroke-width: 1;
	}

	.axis-label {
		font-size: 10px;
		fill: rgba(161, 161, 170, 0.6);
	}

	.axis-title {
		font-size: 10px;
		fill: rgba(161, 161, 170, 0.4);
		letter-spacing: 0.03em;
	}

	.data-point {
		cursor: pointer;
		transition: r 0.1s ease;
	}

	.tooltip {
		position: absolute;
		z-index: 10;
		width: 190px;
		transform: translate(-50%, calc(-100% - 10px));
		pointer-events: none;
	}
</style>
