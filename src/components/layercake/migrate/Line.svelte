<script lang="ts">
	import type { LayerCakeContext, CanvasContext } from "$types/layercake";
	import { getContext } from "svelte";
	import { line, curveLinear } from "d3";

	const { data, xGet, yGet } = getContext<LayerCakeContext>("LayerCake");
	let { stroke = "#ccc", curve = curveLinear } = $props();

	const path = $derived(line().x($xGet).y($yGet).curve(curve));
	const pathD = $derived(path($data as unknown as [number, number][]));
</script>

<path d={pathD} {stroke} />

<style>
	path {
		fill: none;
		stroke-linejoin: round;
		stroke-linecap: round;
		stroke-width: 2;
	}
</style>
