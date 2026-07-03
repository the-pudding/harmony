<script lang="ts">
	import type { ProgressionWithMatchStats } from "../progression-matching-logic/progressionMatchAnalysis.js";
	import { matchOutline } from "./progressionColors.js";
	import ProgressionMatchButton from "./ProgressionMatchButton.svelte";

	type Props = {
		allMatches: ProgressionWithMatchStats[];
		highlightedMatches: ProgressionWithMatchStats[];
		activeProgression: string | null;
		onselect: (chordProgression: string) => void;
	};

	let { allMatches, highlightedMatches, activeProgression, onselect }: Props = $props();

	const highlightedKeys = $derived(new Set(highlightedMatches.map((m) => m.chordProgression)));

	const CHART_HEIGHT = 160;
	const PAD_TOP = 12;
	const PAD_RIGHT = 16;
	const PAD_BOTTOM = 32;
	const PAD_LEFT = 36;
	const POINT_RADIUS = 7;
	const POINT_RADIUS_HOVERED = 9;
	const POINT_RADIUS_DIM = 4;
	const X_TICK_VALS = [0, 25, 50, 75, 100];
	const Y_TICK_COUNT = 4;
	const SUBSET_STROKE_WIDTH = 1.5;
	const SUBSET_DASH_ARRAY = "3 2";

	let containerWidth = $state(0);
	let hoveredMatch = $state<ProgressionWithMatchStats | null>(null);
	let tooltipX = $state(0);
	let tooltipY = $state(0);

	const innerWidth = $derived(containerWidth - PAD_LEFT - PAD_RIGHT);
	const innerHeight = $derived(CHART_HEIGHT - PAD_TOP - PAD_BOTTOM);
	const maxMatchCount = $derived(Math.max(...allMatches.map((m) => m.matchCount), 1));

	const yTickVals = $derived.by(() => {
		const step = Math.max(1, Math.ceil(maxMatchCount / Y_TICK_COUNT));
		const vals: number[] = [];
		for (let v = 0; v <= maxMatchCount; v += step) vals.push(v);
		if (vals[vals.length - 1] !== maxMatchCount) vals.push(maxMatchCount);
		return [...new Set(vals)];
	});

	const DIM_COLOR = "rgb(113, 113, 122)";
	const DIM_OPACITY = 0.5;
	const HIGHLIGHT_OPACITY = 1;
	const JITTER_RANGE_PX = 8;
	const SUBSET_STROKE_COLOR = "rgba(113, 113, 122, 0.8)";

	function toOpaqueColor(color: string): string {
		const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
		return m ? `rgb(${m[1]}, ${m[2]}, ${m[3]})` : color;
	}

	function stableJitter(seed: string, axis: string): number {
		let h = 5381;
		const s = seed + axis;
		for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) ^ s.charCodeAt(i)) | 0;
		return ((h >>> 0) / 0xffffffff - 0.5) * JITTER_RANGE_PX;
	}

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

	const pointAriaLabel = (match: ProgressionWithMatchStats): string => {
		const stats = `${match.matchCount} times, ${Math.round(match.coveragePercent)}% coverage`;
		return match.name ? `${match.name}: ${match.chordProgression}, ${stats}` : `${match.chordProgression}, ${stats}`;
	};
</script>

<div class="scatter-wrap" bind:clientWidth={containerWidth}>
	{#if hoveredMatch}
		{@const outline = matchOutline(hoveredMatch)}
		<div class="tooltip" style:left="{tooltipX}px" style:top="{tooltipY}px">
			<ProgressionMatchButton
				match={hoveredMatch}
				active={activeProgression === hoveredMatch.chordProgression}
				borderColor={outline.color}
				dashed={outline.dashed}
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

			<!-- Dim (non-highlighted) points -->
			{#each allMatches as match (match.chordProgression)}
				{@const isHighlighted = highlightedKeys.has(match.chordProgression)}
				{#if !isHighlighted}
					{@const cx = PAD_LEFT + (match.coveragePercent / 100) * innerWidth + stableJitter(match.chordProgression, 'x')}
					{@const cy = PAD_TOP + innerHeight - (match.matchCount / maxMatchCount) * innerHeight + stableJitter(match.chordProgression, 'y')}
					<circle
						{cx}
						{cy}
						r={POINT_RADIUS_DIM}
						fill={DIM_COLOR}
						opacity={DIM_OPACITY}
						stroke={match.isStrictSubset ? SUBSET_STROKE_COLOR : "transparent"}
						stroke-width={match.isStrictSubset ? SUBSET_STROKE_WIDTH : 0}
						stroke-dasharray={match.isStrictSubset ? SUBSET_DASH_ARRAY : undefined}
						class="data-point"
						role="graphics-symbol"
						aria-label={pointAriaLabel(match)}
						onmouseenter={(e) => handleMouseEnter(e, match)}
						onmousemove={handleMouseMove}
						onmouseleave={() => { hoveredMatch = null; }}
					/>
				{/if}
			{/each}

			<!-- Highlighted points -->
			{#each allMatches as match (match.chordProgression)}
				{@const isHighlighted = highlightedKeys.has(match.chordProgression)}
				{#if isHighlighted}
					{@const cx = PAD_LEFT + (match.coveragePercent / 100) * innerWidth}
					{@const cy = PAD_TOP + innerHeight - (match.matchCount / maxMatchCount) * innerHeight}
					{@const isHovered = hoveredMatch?.chordProgression === match.chordProgression}
					{@const isActive = activeProgression === match.chordProgression}
					<circle
						{cx}
						{cy}
						r={isHovered ? POINT_RADIUS_HOVERED : POINT_RADIUS}
						fill={toOpaqueColor(match.highlightPalette.border)}
						opacity={HIGHLIGHT_OPACITY}
						stroke={isActive ? "rgba(255,255,255,0.7)" : match.isStrictSubset ? SUBSET_STROKE_COLOR : "transparent"}
						stroke-width={isActive || match.isStrictSubset ? SUBSET_STROKE_WIDTH : 0}
						stroke-dasharray={!isActive && match.isStrictSubset ? SUBSET_DASH_ARRAY : undefined}
						class="data-point"
						role="graphics-symbol"
						aria-label={pointAriaLabel(match)}
						onmouseenter={(e) => handleMouseEnter(e, match)}
						onmousemove={handleMouseMove}
						onmouseleave={() => { hoveredMatch = null; }}
					/>
				{/if}
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
