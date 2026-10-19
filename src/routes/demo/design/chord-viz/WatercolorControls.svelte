<script lang="ts">
	import { WATERCOLOR_SLIDERS, type WatercolorSettings } from "./watercolor.js";

	type Props = {
		settings: WatercolorSettings;
		onChange: (settings: WatercolorSettings) => void;
	};

	let { settings, onChange }: Props = $props();
</script>

<div class="controls">
	{#each WATERCOLOR_SLIDERS as slider (slider.key)}
		<label class="slider">
			<span class="title">{slider.title}</span>
			<input
				autocomplete="off"
				type="range"
				min={slider.min}
				max={slider.max}
				step={slider.step}
				value={settings[slider.key]}
				oninput={(event) =>
					onChange({
						...settings,
						[slider.key]: event.currentTarget.valueAsNumber
					})}
			/>
			<span class="value">{settings[slider.key]}</span>
		</label>
	{/each}
</div>

<style>
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 1.5rem;
		font-size: 0.75rem;
		color: var(--chord-viz-muted);
	}

	.slider {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.value {
		min-width: 3rem;
		color: var(--chord-viz-fg);
	}
</style>
