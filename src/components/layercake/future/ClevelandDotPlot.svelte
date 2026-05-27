<!--
	@component
	Generates an SVG Cleveland dot plot, also known as a lollipop-chart.
 -->
<script lang="ts">
	import type { LayerCakeContext } from "$types/layercake";
	import { getContext } from "svelte";

	const { data, xGet, yGet, yScale, zScale, config } = getContext<LayerCakeContext>("LayerCake");
	let { r = 5 } = $props();

	const midHeight = $derived(($yScale.bandwidth?.() ?? 0) / 2);
	const xKeys = $derived($config.x ?? []);
</script>

<g class="dot-plot">
	{#each $data as row}
		{@const yVal = $yGet(row)}
		{@const xVals = $xGet(row) as unknown as number[]}
		<g class="dot-row">
			<line
				x1={Math.min(...xVals)}
				y1={yVal + midHeight}
				x2={Math.max(...xVals)}
				y2={yVal + midHeight}
			></line>

			{#each xVals as circleX, i}
				<circle
					cx={circleX}
					cy={yVal + midHeight}
					{r}
					fill={String($zScale(xKeys[i]))}
				></circle>
			{/each}
		</g>
	{/each}
</g>

<style>
	line {
		stroke-width: 1px;
		stroke: #000;
	}
</style>
