<script lang="ts">
	import type { LayerCakeContext } from "$types/layercake";
	import { getContext } from "svelte";

	const { data, xGet, yGet, yRange, xScale } = getContext<LayerCakeContext>("LayerCake");
	let { fill = "#ccc", stroke = "#000", strokeWidth = 0 } = $props();

	const rows = $derived($data as Record<string, unknown>[]);

	const columnWidth = (d: unknown) => {
		const vals = $xGet(d) as unknown as [number, number];
		return Math.max(0, vals[1] - vals[0]);
	};

	const columnHeight = (d: unknown) => ($yRange ?? [0, 0])[0] - $yGet(d);
</script>

<g>
	{#each rows as d, i}
		{@const xVal = $xGet(d)}
		{@const x = $xScale.bandwidth ? xVal : (xVal as unknown as [number, number])[0]}
		{@const y = $yGet(d)}
		{@const width = $xScale.bandwidth ? ($xScale.bandwidth?.() ?? 0) : columnWidth(d)}
		{@const height = columnHeight(d)}
		<rect
			data-id={i}
			{x}
			{y}
			{width}
			{height}
			{fill}
			{stroke}
			stroke-width={strokeWidth}
		/>
	{/each}
</g>
