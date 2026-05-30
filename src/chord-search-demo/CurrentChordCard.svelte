<script lang="ts">
	import NoteDisplay from "./NoteDisplay.svelte";
	import type { ChordEvent } from "../chord-processing/types.js";
	import ToggleSwitch from "./ToggleSwitch.svelte";

	let {
		chord,
		bassAsRoot,
		onBassAsRootChange
	}: {
		chord: ChordEvent | null;
		bassAsRoot: boolean;
		onBassAsRootChange: (checked: boolean) => void;
	} = $props();
</script>

<section class="card">
	<h2>Current Chord</h2>
	<div class="chord-name" class:active={chord !== null}>
		{chord?.chordName ?? "—"}
	</div>
	<div class="notes">
		<div>
			<div class="label">Bass</div>
			<div class="value">
				{#if chord}
					<NoteDisplay note={chord.bassNote} />
				{:else}
					—
				{/if}
			</div>
		</div>
		<div>
			<div class="label">Treble</div>
			<div class="value">
				{#if chord}
					{#each chord.trebleNotes as note, i}
						{#if i > 0}, {/if}
						<NoteDisplay {note} />
					{/each}
				{:else}
					—
				{/if}
			</div>
		</div>
	</div>
	<ToggleSwitch
		checked={bassAsRoot}
		onchange={onBassAsRootChange}
		label="When classifying, try first to treat the bass note as the root (before assuming it's a slash chord)"
	/>
</section>

<style>
	.card {
		background: rgba(24, 24, 27, 0.8);
		border: 1px solid rgba(39, 39, 42, 0.8);
		border-radius: 0.5rem;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	h2 {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #a1a1aa;
		margin: 0;
	}

	.chord-name {
		font-size: 2.25rem;
		font-weight: 600;
		color: #52525b;
		letter-spacing: -0.025em;
	}

	.chord-name.active {
		color: #fff;
	}

	.notes {
		display: flex;
		gap: 1.5rem;
		font-size: 0.875rem;
	}

	.label {
		font-size: 0.75rem;
		color: #71717a;
	}

	.value {
		color: #a1a1aa;
	}
</style>
