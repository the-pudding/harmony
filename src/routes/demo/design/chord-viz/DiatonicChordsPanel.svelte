<script lang="ts">
	import type { Snippet } from "svelte";
	import { createAllSongsCoverageState } from "../../define-chord-progression/compute-coverage-of-all-songs/createAllSongsCoverageState.svelte.js";
	import ToggleSwitch from "../../../../chord-search-demo/ToggleSwitch.svelte";
	import ChordVizPanel from "./ChordVizPanel.svelte";
	import TopProgressionsList from "./TopProgressionsList.svelte";
	import WatercolorChord from "./WatercolorChord.svelte";
	import WatercolorProgressionChords from "./WatercolorProgressionChords.svelte";
	import { CHORD_VIZ_ROWS, type KeyTonality } from "./diatonicChords.js";
	import {
		DEFAULT_PROGRESSION_FILTERS,
		type ProgressionFilters,
		type ProgressionToken
	} from "./topProgressions.js";
	import { CHORD_PALETTES } from "./chordPalettes.js";
	import {
		DEFAULT_WATERCOLOR_SETTINGS,
		CHORD_OVERLAP_GAP,
		type WatercolorSettings
	} from "./watercolor.js";

	const WATERCOLOR_NOTEBOOK_URL =
		"https://observablehq.com/@veltman/watercolor";

	type Props = {
		settings?: WatercolorSettings;
		filterable?: boolean;
		controls?: Snippet;
	};

	let {
		settings = DEFAULT_WATERCOLOR_SETTINGS,
		filterable = false,
		controls
	}: Props = $props();

	const coverage = createAllSongsCoverageState();
	let filters = $state<ProgressionFilters>(DEFAULT_PROGRESSION_FILTERS);
</script>

<ChordVizPanel
	title="Diatonic chords"
	creditLabel="Noah Veltman's Watercolor notebook"
	creditUrl={WATERCOLOR_NOTEBOOK_URL}
>
	{@render controls?.()}
	{#if filterable}
		<div class="filters">
			<ToggleSwitch
				checked={filters.requiresMinorChord}
				onchange={(requiresMinorChord) =>
					(filters = { ...filters, requiresMinorChord })}
				label="Must include at least one minor chord"
			/>
			<ToggleSwitch
				checked={filters.requiresMinorKey}
				onchange={(requiresMinorKey) =>
					(filters = { ...filters, requiresMinorKey })}
				label="Is in a minor key"
			/>
		</div>
	{/if}
	<div class="palette-sections">
		{#each CHORD_PALETTES as namedPalette (namedPalette.id)}
			<section class="palette-section">
				<h3 class="palette-title">{namedPalette.label}</h3>
				<div class="columns">
					<div class="rows">
						{#each CHORD_VIZ_ROWS as row (row.scale)}
							<div class="row">
								<span class="row-label">{row.label}</span>
								<div
									class="chords"
									style:--chord-gap="{CHORD_OVERLAP_GAP}px"
								>
									{#each row.chords as chord (chord.degree)}
										<WatercolorChord
											{chord}
											{settings}
											palette={namedPalette.palette}
										/>
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
						<WatercolorProgressionChords
							{tokens}
							{tonality}
							{settings}
							palette={namedPalette.palette}
						/>
					{/snippet}
					<TopProgressionsList
						chordRenderer={watercolorChordRenderer}
						{coverage}
						bind:filters
						showFilters={false}
					/>
				</div>
			</section>
		{/each}
	</div>
</ChordVizPanel>

<style>
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
		margin-bottom: 1rem;
	}

	.palette-sections {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.palette-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.palette-title {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #18181b;
	}

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
