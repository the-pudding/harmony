<script lang="ts">
	import { onMount } from "svelte";
	import { Tween } from "svelte/motion";
	import { cubicInOut } from "svelte/easing";
	import { reducedMotion } from "./motifs";

	let { compact = false, delay = 400 } = $props();

	const uid = $props.id();
	const W = 120;
	// the bar is thicker in compact (chapter titles), where it renders tiny
	const TRACK = $derived(compact ? 9 : 5);
	const FILL = $derived(TRACK - 2.5);
	const VB_H = $derived(TRACK + 4);
	const fill = new Tween(0, { duration: 1800, easing: cubicInOut });

	onMount(() => {
		if (reducedMotion.current) {
			fill.set(1, { duration: 0 });
			return;
		}
		const timer = setTimeout(() => fill.set(1), delay);
		return () => clearTimeout(timer);
	});
</script>

<!-- an empty progress bar that fills once, left to right -->
<svg
	viewBox={compact ? `0 13 120 ${VB_H}` : "0 0 120 22"}
	style:aspect-ratio={compact ? `120 / ${VB_H}` : "120 / 22"}
	style:height="{((compact ? VB_H : 22) * 1.5) / 34}em"
	overflow="visible"
>
	<defs>
		<clipPath id="{uid}-clip">
			<rect x="0" y="0" width={W * fill.current} height="22" />
		</clipPath>
	</defs>
	{#if !compact}
		<g class="label" fill="currentColor">
			<text x="0" y="8" text-anchor="start">0%</text>
			<text x={W} y="8" text-anchor="end">100%</text>
		</g>
	{/if}
	<rect
		x="0.75"
		y="14"
		width={W - 1.5}
		height={TRACK}
		rx={Math.min(2.5, TRACK / 2)}
		fill="none"
		stroke="currentColor"
		stroke-width="1.5"
		opacity="0.55"
	/>
	<g clip-path="url(#{uid}-clip)">
		<rect
			x="3"
			y={14 + (TRACK - FILL) / 2}
			width={W - 6}
			height={FILL}
			rx="1"
			fill="currentColor"
		/>
	</g>
</svg>

<style>
	svg {
		display: block;
		width: auto;
	}
	.label {
		font-family: var(--font-mono);
		font-size: 9px;
	}
</style>
