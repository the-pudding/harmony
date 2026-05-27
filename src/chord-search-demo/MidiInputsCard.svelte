<script lang="ts">
	import MidiDeviceCard from "./MidiDeviceCard.svelte";
	import type { MidiDeviceInfo } from "../chord-processing/types.js";

	let {
		inputs,
		selectedInputName,
		onInputChange
	}: {
		inputs: MidiDeviceInfo[];
		selectedInputName: string;
		onInputChange: (name: string) => void;
	} = $props();

	const inputCountLabel = $derived(
		inputs.length === 0
			? "0 inputs"
			: `${inputs.length} input${inputs.length !== 1 ? "s" : ""}`
	);
</script>

<section class="card">
	<div class="head">
		<h2>MIDI Inputs</h2>
		<span class="count">{inputCountLabel}</span>
	</div>
	<div class="list">
		{#if inputs.length === 0}
			<span class="empty">Not connected</span>
		{:else}
			{#each inputs as device (device.id)}
				<MidiDeviceCard {device} />
			{/each}
		{/if}
	</div>
	{#if inputs.length > 0}
		<label class="switcher">
			<span>Active input</span>
			<select value={selectedInputName} onchange={(e) => onInputChange(e.currentTarget.value)}>
				{#each inputs as device (device.id)}
					<option value={device.name}>{device.name}</option>
				{/each}
			</select>
		</label>
	{/if}
</section>

<style>
	.card {
		background: #18181b;
		border: 1px solid #27272a;
		border-radius: 0.5rem;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	h2 {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #a1a1aa;
		margin: 0;
	}

	.count {
		font-size: 0.75rem;
		color: #71717a;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		font-size: 0.75rem;
	}

	.empty {
		color: #71717a;
		font-style: italic;
	}

	.switcher {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.switcher span {
		font-size: 0.75rem;
		color: #a1a1aa;
	}

	select {
		width: 100%;
		background: #27272a;
		border: 1px solid #3f3f46;
		border-radius: 0.25rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
		color: #fff;
		font-family: inherit;
	}

	select:focus {
		outline: none;
		border-color: #71717a;
	}
</style>
