<script lang="ts">
	import { formatChordName } from "../chord-processing/index.js";
	import type { ParsedProgressionChord } from "../chord-processing/types.js";
	import { simplifySuffix } from "../chord-processing/chord-classifier/fuzzySuffixMap.js";
	import { SEARCH_PLACEHOLDER } from "./constants.js";
	import ProgressionChordChip from "./ProgressionChordChip.svelte";

	let {
		chords,
		fuzzySearch = false,
		ignoreSlashBassNotes = false
	}: {
		chords: ParsedProgressionChord[];
		fuzzySearch?: boolean;
		ignoreSlashBassNotes?: boolean;
	} = $props();

	function displayChordName(chord: ParsedProgressionChord) {
		const suffix = fuzzySearch ? simplifySuffix(chord.suffix) : chord.suffix;
		const base = { rootPitchClass: chord.rootPitchClass, suffix };
		return formatChordName(ignoreSlashBassNotes ? base : { ...base, bassPitchClass: chord.bassPitchClass });
	}

	function isFuzzified(chord: ParsedProgressionChord) {
		return fuzzySearch && simplifySuffix(chord.suffix) !== chord.suffix;
	}
</script>

<div class="progression" class:filled={chords.length > 0}>
	{#if chords.length === 0}
		{SEARCH_PLACEHOLDER}
	{:else}
		{#each chords as chord, i (i)}
			{#if i > 0}<span class="arrow">→</span>{/if}
			<ProgressionChordChip
				name={displayChordName(chord)}
				originalDisplay={chord.display}
				showOriginal={isFuzzified(chord)}
			/>
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
		align-items: flex-end;
		gap: 0.5rem;
	}

	.arrow {
		color: #52525b;
	}
</style>
