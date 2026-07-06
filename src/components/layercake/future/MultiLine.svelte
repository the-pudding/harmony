<!--
	@component
	Generates an SVG multi-series line chart. It expects your data to be an array of objects, each with a `values` key that is an array of data objects.
 -->
<script lang="ts">
	import type { LayerCakeContext } from "$types/layercake";
	import { getContext } from "svelte";

	const { data, xGet, yGet, zGet } = getContext<LayerCakeContext>("LayerCake");

	const path = (values: unknown[]) =>
		"M" + values.map((d) => `${$xGet(d)},${$yGet(d)}`).join("L");
</script>

<g class="line-group">
	{#each $data as group}
		<path
			class="path-line"
			d={path((group as { values: unknown[] }).values)}
			stroke={String($zGet(group))}
		></path>
	{/each}
</g>

<style>
	.path-line {
		fill: none;
		stroke-linejoin: round;
		stroke-linecap: round;
		stroke-width: 3px;
	}
</style>
