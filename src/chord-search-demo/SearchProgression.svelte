<script lang="ts">
	import { formatChordName } from "../chord-processing/index.js";
	import type { ParsedProgressionChord } from "../chord-processing/types.js";
	import { simplifySuffix } from "../chord-processing/chord-classifier/fuzzySuffixMap.js";
	import {
		SEARCH_PLACEHOLDER,
		SEARCH_PLACEHOLDER_PAUSED,
		TOP_NAV_CHORD_SEARCH_GROUP_CONTENT_MIN_HEIGHT
	} from "./constants.js";
	import ProgressionChordChip from "./ProgressionChordChip.svelte";

	let {
		chords,
		fuzzySearch = false,
		ignoreSlashBassNotes = false,
		searchInputActive = true
	}: {
		chords: ParsedProgressionChord[];
		fuzzySearch?: boolean;
		ignoreSlashBassNotes?: boolean;
		searchInputActive?: boolean;
	} = $props();

	const emptyPlaceholder = $derived(
		searchInputActive ? SEARCH_PLACEHOLDER : SEARCH_PLACEHOLDER_PAUSED
	);

	function displayChordName(chord: ParsedProgressionChord) {
		const suffix = fuzzySearch ? simplifySuffix(chord.suffix) : chord.suffix;
		const base = { rootPitchClass: chord.rootPitchClass, suffix };
		return formatChordName(ignoreSlashBassNotes ? base : { ...base, bassPitchClass: chord.bassPitchClass });
	}

	function isFuzzified(chord: ParsedProgressionChord) {
		return fuzzySearch && simplifySuffix(chord.suffix) !== chord.suffix;
	}
</script>

<div
	class="progression"
	class:filled={chords.length > 0}
	class:paused={chords.length === 0 && !searchInputActive}
	style="--progression-min-height: {TOP_NAV_CHORD_SEARCH_GROUP_CONTENT_MIN_HEIGHT};"
>
	{#if chords.length === 0}
		{emptyPlaceholder}
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
		min-height: var(--progression-min-height);
		display: flex;
		align-items: center;
	}

	.progression.paused {
		color: #f87171;
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
