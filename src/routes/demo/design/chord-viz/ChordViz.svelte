<script lang="ts">
	import DiatonicChordsPanel from "./DiatonicChordsPanel.svelte";
	import WatercolorControls from "./WatercolorControls.svelte";
	import { PANEL_APPEARANCE_FLUSH } from "./chordVizTheme.js";
	import {
		DEFAULT_WATERCOLOR_SETTINGS,
		type WatercolorSettings
	} from "./watercolor.js";

	let settings = $state<WatercolorSettings>(DEFAULT_WATERCOLOR_SETTINGS);
</script>

<DiatonicChordsPanel
	{settings}
	filterable
	appearance={PANEL_APPEARANCE_FLUSH}
>
	{#snippet controls()}
		<WatercolorControls {settings} onChange={(next) => (settings = next)} />
	{/snippet}
</DiatonicChordsPanel>
