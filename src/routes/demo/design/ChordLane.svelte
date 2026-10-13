<script lang="ts">
	import type { Snippet } from "svelte";
	import { pointerFractionOf } from "./timelineStyles.js";

	type Props = {
		label: string;
		heightPx: number;
		widthPx?: number;
		onSeek: (fraction: number) => void;
		children: Snippet;
	};

	let {
		label,
		heightPx,
		widthPx = $bindable(0),
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
		background: #ffffff;
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
