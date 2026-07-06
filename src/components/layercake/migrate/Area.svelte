<script lang="ts">
	import type { LayerCakeContext, CanvasContext } from "$types/layercake";
	import { getContext } from "svelte";
	import { area, curveLinear } from "d3";

	const { data, xGet, yGet, yScale } =
		getContext<LayerCakeContext>("LayerCake");
	let { fill = "#ccc", curve = curveLinear } = $props();

	const path = $derived(
		area<unknown>()
			.x($xGet)
			.y1($yGet)
			.y0(() => $yScale(0))
			.curve(curve)
	);
</script>

<path d={path($data)} {fill} />
