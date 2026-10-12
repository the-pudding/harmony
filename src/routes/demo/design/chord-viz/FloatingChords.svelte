<script lang="ts">
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

	const HEXAGONS_NOTEBOOK_URL = "https://observablehq.com/d/821fca17be68685d";

	const uid = $props.id();
	const ids = floatingIdsFor(uid);

	let settings = $state<FloatingSettings>(DEFAULT_FLOATING_SETTINGS);
</script>

<ChordVizPanel
	title="Floating chords"
	creditLabel="Nadieh Bremer's SVG gradient & filter playground"
	creditUrl={HEXAGONS_NOTEBOOK_URL}
>
	<FloatingDefs {ids} />
	<FloatingControls {settings} onChange={(next) => (settings = next)} />
	{#snippet floatingChordRenderer({ tokens })}
		<ProgressionChords {tokens} {settings} {ids} />
	{/snippet}
	<div class="columns">
		<FloatingHexagon {settings} {ids} />
		<TopProgressionsList chordRenderer={floatingChordRenderer} />
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
