<script lang="ts">
	import ToggleSwitch from "../../../../chord-search-demo/ToggleSwitch.svelte";
	import SegmentedControl from "./SegmentedControl.svelte";
	import {
		BLEND_OPTIONS,
		GRADIENT_OPTIONS,
		type FloatingSettings
	} from "./floatingEffects.js";

	type Props = {
		settings: FloatingSettings;
		onChange: (settings: FloatingSettings) => void;
	};

	let { settings, onChange }: Props = $props();
</script>

<div class="controls">
	<ToggleSwitch
		checked={settings.animate}
		onchange={(animate) => onChange({ ...settings, animate })}
		label="Do animation"
	/>
	<SegmentedControl
		title="Gradient effect"
		options={GRADIENT_OPTIONS}
		value={settings.gradient}
		onChange={(gradient) => onChange({ ...settings, gradient })}
	/>
	<SegmentedControl
		title="Color blending effect"
		options={BLEND_OPTIONS}
		value={settings.blend}
		onChange={(blend) => onChange({ ...settings, blend })}
	/>
</div>

<style>
	.controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
</style>
