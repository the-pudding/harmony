<script lang="ts">
	import type { LayerCakeContext, CanvasContext } from "$types/layercake";
	import { getContext } from "svelte";

	const { data, xGet, yGet, xScale, yScale } =
		getContext<LayerCakeContext>("LayerCake");
	let { r = 4, fill = "#ccc", stroke = "#000", strokeWidth = 0 } = $props();
</script>

<g>
	{#each $data as d}
		{@const cx = $xGet(d)}
		{@const cy = $yGet(d)}
		<circle {cx} {cy} {r} {fill} {stroke} stroke-width={strokeWidth} />
	{/each}
</g>
