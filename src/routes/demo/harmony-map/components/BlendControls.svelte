<script lang="ts">
	import { untrack } from "svelte";
	import type { BlendWeights } from "../embedding/vectors/index.js";

	type Props = {
		weights: BlendWeights;
		onChange: (weights: BlendWeights) => void;
	};

	const { weights, onChange }: Props = $props();

	const SNAP_STEP = 0.2;
	const DEBOUNCE_MS = 400;

	const snap = (value: number) => Math.round(value / SNAP_STEP) * SNAP_STEP;

	const sliders = $derived([
		{
			key: "identity" as const,
			label: "identity",
			min: 0,
			max: 2,
			step: SNAP_STEP,
			description: "Weight for exact progression identity — songs sharing the same chord progressions are pulled together."
		},
		{
			key: "content" as const,
			label: "content",
			min: 0,
			max: 2,
			step: SNAP_STEP,
			description: "Weight for progression content similarity — shared chord patterns, n-grams, and cadences across progressions, even when they aren't identical."
		},
		{
			key: "groupShare" as const,
			label: "groups",
			min: 0,
			max: 2,
			step: SNAP_STEP,
			description: "Weight for editorial group membership — songs sharing the same core-progression family are pulled closer."
		},
		{
			key: "axes" as const,
			label: "axes",
			min: 0,
			max: 2,
			step: SNAP_STEP,
			description: "Weight for hand-crafted harmonic axes (brightness and complexity), placing songs with similar overall harmonic character nearby."
		},
		{
			key: "groupPull" as const,
			label: "pull",
			min: 0,
			max: 1,
			step: SNAP_STEP,
			description: "Supervised pull strength — how hard UMAP pulls songs toward their editorial group center. 0 = off, higher values enforce tighter group clusters."
		}
	]);

	let localWeights = $state<BlendWeights>(untrack(() => ({ ...weights })));
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		localWeights = { ...weights };
	});

	const handleChange = (key: keyof BlendWeights, rawValue: number) => {
		const snapped = snap(rawValue);
		localWeights = { ...localWeights, [key]: snapped };
		if (debounceTimer !== null) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			onChange({ ...localWeights });
			debounceTimer = null;
		}, DEBOUNCE_MS);
	};
</script>

<div class="blend-controls" role="group" aria-label="Blend weights">
	{#each sliders as slider (slider.key)}
		<label class="blend-slider">
			<span class="blend-label-group">
				<span class="blend-label">{slider.label}</span>
				<span class="info-icon" role="img" aria-label="info about {slider.label}">ⓘ</span>
				<span class="tooltip">{slider.description}</span>
			</span>
			<input
				type="range"
				min={slider.min}
				max={slider.max}
				step={slider.step}
				value={localWeights[slider.key]}
				oninput={(e) => handleChange(slider.key, parseFloat(e.currentTarget.value))}
			/>
			<span class="blend-value">{localWeights[slider.key].toFixed(1)}</span>
		</label>
	{/each}
</div>

<style>
	.blend-controls {
		display: flex;
		gap: 0.25rem;
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.375rem;
		padding: 0.125rem;
	}

	.blend-slider {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.125rem;
		padding: 0.25rem 0.5rem;
		color: #a1a1aa;
		cursor: pointer;
	}

	.blend-label-group {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.15rem;
	}

	.blend-label {
		font-size: 0.7rem;
	}

	.info-icon {
		font-size: 0.6rem;
		cursor: help;
		color: rgba(165, 180, 252, 0.5);
		line-height: 1;
	}

	.tooltip {
		display: none;
		position: absolute;
		top: calc(100% + 6px);
		left: 50%;
		transform: translateX(-50%);
		background: #1c1c1e;
		color: #d4d4d8;
		border: 1px solid #3f3f46;
		border-radius: 0.375rem;
		padding: 0.375rem 0.5rem;
		font-size: 0.65rem;
		width: 12rem;
		z-index: 20;
		pointer-events: none;
		white-space: normal;
		text-align: center;
		line-height: 1.4;
	}

	.blend-label-group:hover .tooltip {
		display: block;
	}

	.blend-value {
		font-size: 0.55rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: rgba(165, 180, 252, 0.95);
	}

	input[type="range"] {
		width: 4rem;
		accent-color: rgba(99, 102, 241, 0.8);
		cursor: pointer;
	}
</style>
