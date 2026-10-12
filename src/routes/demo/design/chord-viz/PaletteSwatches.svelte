<script lang="ts">
	import { paletteSwatches, type ChordPalette } from "./chordPalettes.js";

	type Props = { palette: ChordPalette };

	let { palette }: Props = $props();

	const swatches = $derived(paletteSwatches(palette));
</script>

<span class="swatches" aria-hidden="true">
	{#each swatches as fill, index (index)}
		<span class="swatch" style:background={fill}></span>
	{/each}
</span>

<style>
	.swatches {
		display: inline-flex;
		gap: 2px;
	}

	.swatch {
		width: 0.875rem;
		height: 0.875rem;
		border-radius: 2px;
	}
</style>
