<script lang="ts">
	import { formatChordName } from "../chord-processing/index.js";
	import type { ParsedProgressionChord } from "../chord-processing/types.js";
	import { SEARCH_PLACEHOLDER } from "./constants.js";

	let { chords }: { chords: ParsedProgressionChord[] } = $props();
</script>

<div class="progression" class:filled={chords.length > 0}>
	{#if chords.length === 0}
		{SEARCH_PLACEHOLDER}
	{:else}
		{#each chords as chord, i}
			{#if i > 0}<span class="arrow">→</span>{/if}
			<span class="chip">{formatChordName(chord)}</span>
		{/each}
	{/if}
</div>

<style>
	.progression {
		font-size: 0.875rem;
		color: #71717a;
		font-style: italic;
		min-height: 1.5rem;
	}

	.progression.filled {
		color: #fff;
		font-style: normal;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.arrow {
		color: #52525b;
	}

	.chip {
		background: rgba(30, 27, 75, 0.6);
		border: 1px solid rgba(67, 56, 202, 0.6);
		border-radius: 0.25rem;
		padding: 0.125rem 0.5rem;
	}
</style>
