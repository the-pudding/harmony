<script module lang="ts">
	// A song in the beeswarm: when it came out and its dot color on the map.
	export type BeeswarmSong = { songKey: string; year: number; color: string };
</script>

<script lang="ts">
	// A hovered cluster's songs over time: one dot per song, stacked by
	// release year (adapted from ArtistSongTimeline). Display only; the
	// tooltip it sits in can't be hovered.
	import { scaleLinear } from "d3";
	import {
		beeswarmChartHeight,
		dodgeBeeswarm,
		tallestStackHeight,
		type DodgedPoint
	} from "$routes/demo/shared/charts/dodgeBeeswarm.js";

	// Dots shrink through these radii until the tallest stack fits.
	const DOT_RADII = [3, 2.5, 2, 1.5, 1.25, 1];
	const MAX_STACK_HEIGHT = 90;
	const DOT_SPACING = 0.5;
	const PADDING_X = 4;
	const TOP_PADDING = 4;
	const AXIS_HEIGHT = 18;
	const YEAR_PADDING = 0.5;
	const TICK_COUNT = 6;

	let {
		songs,
		yearDomain
	}: {
		songs: readonly BeeswarmSong[];
		// Shared by every cluster, so their timelines line up.
		yearDomain: { min: number; max: number };
	} = $props();

	let width = $state(0);

	const xScale = $derived(
		scaleLinear()
			.domain([yearDomain.min - YEAR_PADDING, yearDomain.max + YEAR_PADDING])
			.range([PADDING_X, Math.max(PADDING_X, width - PADDING_X)])
	);

	const ticks = $derived(
		xScale
			.ticks(TICK_COUNT)
			.filter((tick) => Number.isInteger(tick))
			.map((tick) => ({ year: tick, x: xScale(tick) }))
	);

	const layout = $derived.by(() => {
		let radius = DOT_RADII[0];
		let nodes: DodgedPoint<BeeswarmSong>[] = [];
		if (width <= 0) return { radius, nodes };
		for (radius of DOT_RADII) {
			nodes = dodgeBeeswarm(
				songs,
				(song) => xScale(song.year),
				radius,
				DOT_SPACING
			);
			if (tallestStackHeight(nodes) + radius * 2 <= MAX_STACK_HEIGHT) break;
		}
		return { radius, nodes };
	});

	const chartHeight = $derived(
		beeswarmChartHeight(layout.nodes, TOP_PADDING, layout.radius, AXIS_HEIGHT)
	);

	const axisY = $derived(chartHeight - AXIS_HEIGHT);
</script>

<div class="beeswarm" bind:clientWidth={width}>
	{#if width > 0}
		<svg {width} height={chartHeight} aria-hidden="true">
			<line
				x1={PADDING_X}
				x2={width - PADDING_X}
				y1={axisY}
				y2={axisY}
				class="axis-line"
			/>
			{#each ticks as tick (tick.year)}
				<line
					x1={tick.x}
					x2={tick.x}
					y1={axisY}
					y2={axisY + 3}
					class="tick-mark"
				/>
				<text x={tick.x} y={axisY + 13} text-anchor="middle" class="tick-label">
					{tick.year}
				</text>
			{/each}
			{#each layout.nodes as node (node.item.songKey)}
				<circle
					cx={node.x}
					cy={axisY - layout.radius - node.y}
					r={layout.radius}
					fill={node.item.color}
				/>
			{/each}
		</svg>
	{/if}
</div>

<style>
	.beeswarm {
		width: 100%;
		margin-top: 0.5rem;
	}

	svg {
		display: block;
		overflow: visible;
	}

	.axis-line {
		stroke: rgba(255, 255, 255, 0.15);
		stroke-width: 1;
	}

	.tick-mark {
		stroke: rgba(255, 255, 255, 0.25);
		stroke-width: 1;
	}

	.tick-label {
		font-size: 0.55rem;
		fill: rgba(161, 161, 170, 0.7);
	}
</style>
