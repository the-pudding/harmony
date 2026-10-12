<script lang="ts">
	import WatercolorChord from "./WatercolorChord.svelte";
	import WatercolorControls from "./WatercolorControls.svelte";
	import { CHORD_VIZ_ROWS } from "./diatonicChords.js";
	import {
		DEFAULT_WATERCOLOR_SETTINGS,
		type WatercolorSettings
	} from "./watercolor.js";

	let settings = $state<WatercolorSettings>(DEFAULT_WATERCOLOR_SETTINGS);
</script>

<div class="chord-viz">
	<WatercolorControls {settings} onChange={(next) => (settings = next)} />
	{#each CHORD_VIZ_ROWS as row (row.scale)}
		<div class="row">
			<span class="row-label">{row.label}</span>
			<div class="chords">
				{#each row.chords as chord (chord.degree)}
					<WatercolorChord {chord} {settings} />
				{/each}
			</div>
		</div>
	{/each}
</div>

<style>
	.chord-viz {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.row-label {
		width: 4rem;
		font-size: 0.75rem;
		color: #a1a1aa;
	}

	.chords {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
</style>
