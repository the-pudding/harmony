<script lang="ts">
	import DiatonicChordsPanel from "./DiatonicChordsPanel.svelte";
	import WatercolorControls from "./WatercolorControls.svelte";
	import {
		DEFAULT_WATERCOLOR_SETTINGS,
		type WatercolorSettings
	} from "./watercolor.js";

	let settings = $state<WatercolorSettings>(DEFAULT_WATERCOLOR_SETTINGS);
</script>

<DiatonicChordsPanel {settings} filterable>
	{#snippet controls()}
		<WatercolorControls {settings} onChange={(next) => (settings = next)} />
	{/snippet}
</DiatonicChordsPanel>
