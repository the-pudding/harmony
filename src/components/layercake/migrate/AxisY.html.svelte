<script lang="ts">
	import type { LayerCakeContext, LayerCakeTicks } from "$types/layercake";
	import { getContext } from "svelte";

	const { padding, xRange, yScale } = getContext<LayerCakeContext>("LayerCake");
	const pad = $derived($padding);
	let {
		gridlines = true,
		tickMarks = false,
		baseline = false,
		yTick = -1,
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

<div class="axis y-axis" style="transform:translate(-{pad.left ?? 0}px, 0)">
	{#each tickVals as tick, i}
		<div
			class="tick tick-{i}"
			style="top:{$yScale(tick)}%;left:{($xRange ?? [0, 0])[0]}%;"
		>
			{#if gridlines !== false}
				<div
					class="gridline"
					style="top:0;left:0px;right:-{(pad.left ?? 0) + (pad.right ?? 0)}px;"
				/>
			{/if}
			{#if baseline !== false && i === 0}
				<div
					class="gridline baseline"
					style="top:0;left:0;right:-{(pad.left ?? 0) + (pad.right ?? 0)}px;"
				/>
			{/if}
			{#if tickMarks === true}
				<div class="tick-mark" style="top:0;left:0}px;width:6px;" />
			{/if}
			<div
				class="text"
				style="
					top:{yTick}px;
					left:0px;
					transform: translate(0, -100%);
				"
			>
				{formatTick(tick)}
			</div>
		</div>
	{/each}
</div>

<style>
	.axis,
	.tick,
	.tick-mark,
	.gridline,
	.baseline,
	.text {
		position: absolute;
	}

	.axis {
		width: 100%;
		height: 100%;
	}

	.tick {
		font-size: 12px;
		width: 100%;
		font-weight: 100;
	}

	.gridline {
		border-top: 1px dashed var(--color-gray-300);
	}
	.tick-mark {
		border-top: 1px solid var(--color-gray-300);
	}

	.baseline.gridline {
		border-top-style: solid;
	}

	.tick .text {
		color: var(--color-gray-600);
	}
</style>
