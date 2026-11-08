<script lang="ts">
	import { fade } from "svelte/transition";
	import { ROTATING_LABEL_FADE_MS } from "./constants.js";
	import type { RotatingLabel } from "./rotatingLabels.svelte.js";
	import type { Point2D } from "./types.js";

	// Hex-mode labels that fade in and out one at a time over the map.
	let {
		labels,
		screenOf,
		textColor,
		haloColor
	}: {
		labels: readonly RotatingLabel[];
		screenOf: (label: RotatingLabel) => Point2D;
		textColor: string;
		haloColor: string;
	} = $props();
</script>

{#each labels as label (label.id)}
	{@const screen = screenOf(label)}
	<span
		class="rotating-label"
		style:left="{screen.x}px"
		style:top="{screen.y}px"
		style:--label-text={textColor}
		style:--label-halo={haloColor}
		transition:fade={{ duration: ROTATING_LABEL_FADE_MS }}
	>
		{label.text}
	</span>
{/each}

<style>
	/* Matches HEX_LABEL_FONT and the canvas labels' halo. */
	.rotating-label {
		position: absolute;
		transform: translate(-50%, -50%);
		pointer-events: none;
		white-space: nowrap;
		font:
			700 14px "Gooper SemiCondensed",
			Georgia,
			serif;
		color: var(--label-text);
		text-shadow:
			-1.5px 0 var(--label-halo),
			1.5px 0 var(--label-halo),
			0 -1.5px var(--label-halo),
			0 1.5px var(--label-halo),
			-1px -1px var(--label-halo),
			1px 1px var(--label-halo),
			-1px 1px var(--label-halo),
			1px -1px var(--label-halo);
	}
</style>
