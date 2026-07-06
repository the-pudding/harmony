<script lang="ts">
	import type { LayerCakeContext, LayerCakeTicks } from "$types/layercake";
	import { getContext } from "svelte";

	const { padding, xRange, yScale } = getContext<LayerCakeContext>("LayerCake");
	const pad = $derived($padding);
	let {
		gridlines = true,
		tickMarks = false,
		xTick = 0,
		yTick = 0,
		dxTick = 0,
		dyTick = -4,
		textAnchor = "start",
		formatTick = (d: string | number) => String(d),
		ticks = 4 as LayerCakeTicks
	} = $props();

	/** If this is a number, it passes that along to the [d3Scale.ticks](https://github.com/d3/d3-scale) function. If this is an array, hardcodes the ticks to those values. If it's a function, passes along the default tick values and expects an array of tick values in return. */

	const tickVals = $derived(
		Array.isArray(ticks)
			? ticks
			: typeof ticks === "function"
				? ticks($yScale.ticks())
				: $yScale.ticks(ticks)
	);
</script>

<g class="axis y-axis" transform="translate({-(pad.left ?? 0)}, 0)">
	{#each tickVals as tick}
		<g
			class="tick tick-{tick}"
			transform="translate({($xRange ?? [0, 0])[0]}, {$yScale(tick)})"
		>
			{#if gridlines !== false}
				<line class="gridline" x2="100%" y1={yTick} y2={yTick} />
			{/if}
			{#if tickMarks === true}
				<line class="tick-mark" x1="0" x2={6} y1={yTick} y2={yTick} />
			{/if}
			<text
				x={xTick}
				y={yTick}
				dx={dxTick}
				dy={dyTick}
				style="text-anchor:{textAnchor};">{formatTick(tick)}</text
			>
		</g>
	{/each}
</g>

<style>
	.tick {
		font-size: 0.725em;
		font-weight: 200;
	}

	.tick line {
		stroke: var(--color-gray-300);
	}
	.tick .gridline {
		stroke-dasharray: 4px 4px;
	}

	.tick text {
		fill: var(--color-gray-600);
	}
</style>
