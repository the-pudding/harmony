<script lang="ts">
	import { createAllSongsCoverageState } from "../../define-chord-progression/compute-coverage-of-all-songs/createAllSongsCoverageState.svelte.js";
	import ChordVizPanel from "./ChordVizPanel.svelte";
	import FloatingControls from "./FloatingControls.svelte";
	import FloatingDefs from "./FloatingDefs.svelte";
	import FloatingHexagon from "./FloatingHexagon.svelte";
	import ProgressionChords from "./ProgressionChords.svelte";
	import TopProgressionsList from "./TopProgressionsList.svelte";
	import {
		DEFAULT_FLOATING_SETTINGS,
		floatingIdsFor,
		type FloatingSettings
	} from "./floatingEffects.js";
	import { PANEL_APPEARANCE_FLUSH } from "./chordVizTheme.js";
	import {
		DEFAULT_PROGRESSION_FILTERS,
		type ProgressionFilters,
		type ProgressionToken
	} from "./topProgressions.js";

	const HEXAGONS_NOTEBOOK_URL = "https://observablehq.com/d/821fca17be68685d";

	const uid = $props.id();
	const ids = floatingIdsFor(uid);

	let settings = $state<FloatingSettings>(DEFAULT_FLOATING_SETTINGS);
	const coverage = createAllSongsCoverageState();
	let filters = $state<ProgressionFilters>(DEFAULT_PROGRESSION_FILTERS);
</script>

<ChordVizPanel
	title="Floating chords"
	creditLabel="Nadieh Bremer's SVG gradient & filter playground"
	creditUrl={HEXAGONS_NOTEBOOK_URL}
	appearance={PANEL_APPEARANCE_FLUSH}
>
	<FloatingDefs {ids} />
	<FloatingControls {settings} onChange={(next) => (settings = next)} />
	<div class="columns">
		<FloatingHexagon {settings} {ids} />
		{#snippet floatingChordRenderer({ tokens }: { tokens: ProgressionToken[] })}
			<ProgressionChords {tokens} {settings} {ids} />
		{/snippet}
		<TopProgressionsList
			chordRenderer={floatingChordRenderer}
			{coverage}
			bind:filters
		/>
	</div>
</ChordVizPanel>

<style>
	.columns {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
		align-items: start;
		gap: 2rem;
	}
</style>
