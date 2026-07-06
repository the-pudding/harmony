<script lang="ts">
	import type { LayerCakeContext } from "$types/layercake";
	import { getContext } from "svelte";

	const { data, xGet, yGet, zGet, xScale } =
		getContext<LayerCakeContext>("LayerCake");
	const stacks = $derived($data as unknown as unknown[][]);
</script>

<g>
	{#each stacks as series, i}
		{#each series as d}
			{@const yVals = $yGet(d) as unknown as [number, number]}
			{@const height = yVals[0] - yVals[1]}
			{@const x = $xGet(d)}
			{@const y = yVals[1]}
			{@const width = $xScale.bandwidth?.() ?? 0}
			<rect data-id={i} {x} {y} {width} {height} fill={String($zGet(series))} />
		{/each}
	{/each}
</g>
