<script lang="ts">
	import type { Snippet } from "svelte";
	import { LANE_BACKGROUND_WHITE } from "./chordLanes.js";
	import { pointerFractionOf } from "./timelineStyles.js";

	const DEFAULT_LANE_BACKGROUND = LANE_BACKGROUND_WHITE;

	type Props = {
		label: string;
		heightPx: number;
		widthPx?: number;
		background?: string;
		onSeek: (fraction: number) => void;
		children: Snippet;
	};

	let {
		label,
		heightPx,
		widthPx = $bindable(0),
		background = DEFAULT_LANE_BACKGROUND,
		onSeek,
		children
	}: Props = $props();
</script>

<button
	type="button"
	class="lane"
	aria-label="Seek, {label}"
	title={label}
	style:height="{heightPx}px"
	style:--lane-background={background}
	bind:clientWidth={widthPx}
	onclick={(event) => onSeek(pointerFractionOf(event))}
>
	{@render children()}
</button>

<style>
	.lane {
		position: relative;
		display: block;
		width: 100%;
		padding: 0;
		border: none;
		border-radius: 0.375rem;
		background: var(--lane-background);
		cursor: pointer;
		isolation: isolate;
	}

	.lane > :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
	}
</style>
