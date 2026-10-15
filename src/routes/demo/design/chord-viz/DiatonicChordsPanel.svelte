<script lang="ts">
	import type { Snippet } from "svelte";
	import ChordVizPanel from "./ChordVizPanel.svelte";
	import TopProgressionsList from "./TopProgressionsList.svelte";
	import WatercolorChord from "./WatercolorChord.svelte";
	import WatercolorProgressionChords from "./WatercolorProgressionChords.svelte";
	import { CHORD_VIZ_ROWS, type KeyTonality } from "./diatonicChords.js";
	import type { ProgressionToken } from "./topProgressions.js";
	import { DEFAULT_PALETTE, type ChordPalette } from "./chordPalettes.js";
	import {
		DEFAULT_WATERCOLOR_SETTINGS,
		CHORD_OVERLAP_GAP,
		type WatercolorSettings
	} from "./watercolor.js";

	const WATERCOLOR_NOTEBOOK_URL =
		"https://observablehq.com/@veltman/watercolor";

	type Props = {
		settings?: WatercolorSettings;
		palette?: ChordPalette;
		filterable?: boolean;
		controls?: Snippet;
	};

	let {
		settings = DEFAULT_WATERCOLOR_SETTINGS,
		palette = DEFAULT_PALETTE,
		filterable = false,
		controls
	}: Props = $props();
</script>

<ChordVizPanel
	title="Diatonic chords"
	creditLabel="Noah Veltman's Watercolor notebook"
	creditUrl={WATERCOLOR_NOTEBOOK_URL}
>
	{@render controls?.()}
	<div class="columns">
		<div class="rows">
			{#each CHORD_VIZ_ROWS as row (row.scale)}
				<div class="row">
					<span class="row-label">{row.label}</span>
					<div class="chords" style:--chord-gap="{CHORD_OVERLAP_GAP}px">
						{#each row.chords as chord (chord.degree)}
							<WatercolorChord {chord} {settings} {palette} />
						{/each}
					</div>
				</div>
			{/each}
		</div>

		{#snippet watercolorChordRenderer({
			tokens,
			tonality
		}: {
			tokens: ProgressionToken[];
			tonality: KeyTonality;
		})}
			<WatercolorProgressionChords {tokens} {tonality} {settings} {palette} />
		{/snippet}
		<TopProgressionsList chordRenderer={watercolorChordRenderer} {filterable} />
	</div>
</ChordVizPanel>

<style>
	.columns {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: start;
		gap: 2rem;
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.row-label {
		width: 4rem;
		font-size: 0.75rem;
		color: #52525b;
	}

	.chords {
		display: flex;
		flex-wrap: wrap;
	}

	.chords > :global(* + *) {
		margin-left: var(--chord-gap);
	}
</style>
