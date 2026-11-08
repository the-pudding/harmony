<script module lang="ts">
	import coreProgressions from "../../../../data/core-progressions.js";
	import { paletteById } from "$routes/demo/design/chord-viz/chordPalettes.js";

	const chordsByProgressionName = new Map(
		coreProgressions.map((progression) => [
			progression.name,
			[progression.chordProgression].flat()[0]
		])
	);

	const CHORD_PALETTE = paletteById("journey-from-home");
</script>

<script lang="ts">
	import WatercolorProgressionChords from "$routes/demo/design/chord-viz/WatercolorProgressionChords.svelte";
	import { progressionTokensOf } from "$routes/demo/design/chord-viz/topProgressions.js";
	import { DEFAULT_WATERCOLOR_SETTINGS } from "$routes/demo/design/chord-viz/watercolor.js";
	import { romanRe } from "$utils/chordify";
	import type { ClusterRegion } from "../../embedding/layout/hexBins.js";
	import TooltipCard from "./TooltipCard.svelte";

	// The hovered hex's cluster: its color and name, its progressions'
	// chords, and how many songs it holds.
	let {
		region,
		style,
		color,
		songCount,
		titlePrefix
	}: {
		region: ClusterRegion;
		style: string;
		color: string;
		songCount: number;
		// Put before the name, e.g. to mark a cluster with playable songs.
		titlePrefix: string | null;
	} = $props();

	// Named progressions map to their chords; unnamed ones (and names that
	// are themselves roman numerals) show their numerals directly.
	const chords = $derived(
		(region.progressionNames.length > 0
			? region.progressionNames
			: region.name.split(" · ")
		)
			.map((name) => chordsByProgressionName.get(name) ?? name)
			.filter((chord) => chord.split("-").every((r) => romanRe.test(r.trim())))
	);
</script>

<TooltipCard {style}>
	<div class="title">
		<span class="swatch" style:background={color}></span>
		{#if titlePrefix}
			{titlePrefix}
		{/if}
		{region.name}
	</div>
	{#if chords.length > 0}
		<div class="chords">
			{#each chords as progression (progression)}
				<div class="progression">
					<WatercolorProgressionChords
						tokens={progressionTokensOf(progression)}
						tonality="major"
						settings={DEFAULT_WATERCOLOR_SETTINGS}
						palette={CHORD_PALETTE}
					/>
				</div>
			{/each}
		</div>
	{/if}
	<div class="meta">
		{songCount}
		{songCount === 1 ? "song" : "songs"}
	</div>
</TooltipCard>

<style>
	.title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.chords {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.75rem;
		margin-bottom: 0.25rem;
	}

	/* The chords render at full size; shrink the whole row, trim and all. */
	.progression {
		zoom: 0.55;
	}

	.progression :global(.chord) {
		mix-blend-mode: normal;
	}

	.meta {
		color: #a1a1aa;
		font-size: 0.65rem;
	}

	.swatch {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 0.1875rem;
		flex-shrink: 0;
	}
</style>
