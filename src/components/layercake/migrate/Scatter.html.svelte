<script lang="ts">
	import type { LayerCakeContext, CanvasContext } from "$types/layercake";
	import { getContext } from "svelte";

	const { data, xGet, yGet, xScale, yScale } =
		getContext<LayerCakeContext>("LayerCake");
	let { r = 4, fill = "#ccc", stroke = "#000", strokeWidth = 0 } = $props();

	const width = $derived(`${r * 2}px`);
	const height = $derived(width);
</script>

<div>
	{#each $data as d}
		{@const left = $xGet(d)}
		{@const top = $yGet(d)}
		<div
			class="circle"
			style:left
			style:top
			style:width
			style:height
			style:background-color={fill}
			style:border="{strokeWidth}px solid {stroke}"
		/>
	{/each}
</div>

<style>
	.circle {
		position: absolute;
		transform: translate(-50%, -50%);
		border-radius: 50%;
	}
</style>
