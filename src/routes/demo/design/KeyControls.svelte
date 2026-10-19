<script lang="ts">
	import { humanizeScale } from "$data/songBrowser.js";
	import {
		KEY_TONICS,
		type MusicalKey
	} from "../../../chord-processing/chordInKey.js";
	import {
		SCALE_INTERVALS,
		type ScaleName
	} from "../../../chord-processing/scale-intervals.js";

	const SCALES = Object.keys(SCALE_INTERVALS) as ScaleName[];

	type Props = {
		musicalKey: MusicalKey;
		onKeyChange: (key: MusicalKey) => void;
	};

	let { musicalKey, onKeyChange }: Props = $props();
</script>

<div class="key">
	<span class="heading">Key</span>
	<select
		aria-label="Key tonic"
		value={musicalKey.tonic}
		onchange={(event) =>
			onKeyChange({ ...musicalKey, tonic: event.currentTarget.value })}
	>
		{#each KEY_TONICS as tonic (tonic)}
			<option value={tonic}>{tonic}</option>
		{/each}
	</select>
	<select
		aria-label="Key scale"
		value={musicalKey.scale}
		onchange={(event) =>
			onKeyChange({
				...musicalKey,
				scale: event.currentTarget.value as ScaleName
			})}
	>
		{#each SCALES as scale (scale)}
			<option value={scale}>{humanizeScale(scale)}</option>
		{/each}
	</select>
</div>

<style>
	.key {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: fit-content;
		padding: 0.5rem 0.75rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.6);
		font-size: 0.6875rem;
	}

	.heading {
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}

	select {
		padding: 0.25rem 0.5rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.375rem;
		background: #18181b;
		color: #f4f4f5;
		font: inherit;
	}
</style>
