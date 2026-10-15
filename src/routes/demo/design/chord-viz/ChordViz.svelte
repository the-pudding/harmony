<script lang="ts">
	import DiatonicChordsPanel from "./DiatonicChordsPanel.svelte";
	import PaletteSelect from "./PaletteSelect.svelte";
	import WatercolorControls from "./WatercolorControls.svelte";
	import { DEFAULT_PALETTE_ID, paletteById } from "./chordPalettes.js";
	import {
		DEFAULT_WATERCOLOR_SETTINGS,
		type WatercolorSettings
	} from "./watercolor.js";

	let settings = $state<WatercolorSettings>(DEFAULT_WATERCOLOR_SETTINGS);
	let paletteId = $state(DEFAULT_PALETTE_ID);

	const palette = $derived(paletteById(paletteId));
</script>

<DiatonicChordsPanel {settings} {palette} filterable>
	{#snippet controls()}
		<WatercolorControls {settings} onChange={(next) => (settings = next)} />
		<PaletteSelect value={paletteId} onChange={(next) => (paletteId = next)} />
	{/snippet}
</DiatonicChordsPanel>
