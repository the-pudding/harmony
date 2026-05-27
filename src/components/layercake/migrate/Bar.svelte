<script lang="ts">
	import type { LayerCakeContext, CanvasContext } from "$types/layercake";
	import { getContext } from "svelte";

	const { data, xGet, yGet, xScale, yScale } = getContext<LayerCakeContext>("LayerCake");
	let { fill = "#ccc" } = $props();


</script>

<g>
	{#each $data as d, i}
		{@const x = $xScale.range()[0]}
		{@const y = $yGet(d)}
		{@const width = $xGet(d)}
		{@const height = $yScale.bandwidth?.() ?? 0}
		<rect data-id={i} {x} {y} {width} {height} {fill} />
	{/each}
</g>
