<script lang="ts">
	import { getContext } from "svelte";
	import checkOverlap from "$actions/checkOverlap";
	import keepWithinBox from "$actions/keepWithinBox";
	import type { FigureContext, FigureMapFeature } from "$types/figure";

	let {
		features,
		fill = "#000",
		stroke = "none",
		offsetX = 0,
		offsetY = 0,
		strokeWidth = 1
	}: {
		features: FigureMapFeature[];
		fill?: string;
		stroke?: string;
		offsetX?: number;
		offsetY?: number;
		strokeWidth?: number;
	} = $props();

	const { width, height, custom } = getContext<FigureContext>("Figure");
</script>

<g
	class="g-map-labels"
	use:checkOverlap={{ query: "text.stroke", reverse: true }}
>
	{#each features as feature}
		{@const coords = $custom.projectionFn?.(feature.geometry.coordinates)}
		{@const hasCoords = coords}
		{@const x = hasCoords ? coords[0] : 0}
		{@const y = hasCoords ? coords[1] : 0}
		{@const transform = `translate(${x}, ${y})`}
		{@const className = feature.properties.className}
		{#if hasCoords}
			<g {transform} class={className} use:keepWithinBox={{ width: $width }}>
				{#each [0, 1] as i}
					{@const isStroke = i === 0 && stroke !== "none"}
					{@const isRender = isStroke || i > 0}
					{#if isRender}
						<text
							x={offsetX}
							y={offsetY}
							class:stroke={isStroke}
							text-anchor="middle"
							alignment-baseline="baseline"
							style:stroke={isStroke ? stroke : "none"}
							style:stroke-width="{strokeWidth}px"
							style:fill={isStroke ? "none" : feature.properties.fill || fill}
							>{feature.properties.label}</text
						>
					{/if}
				{/each}
			</g>
		{/if}
	{/each}
</g>

<style>
	.g-map-labels {
		pointer-events: none;
	}

	:global(.is-overlap, .is-overlap + text) {
		display: none;
	}

	:global(.is-overlap + text) {
		display: none;
	}

	text {
		letter-spacing: 0.02em;
		transform: translate(0, -12px);
	}
</style>
