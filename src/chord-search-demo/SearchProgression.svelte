<script lang="ts">
	import { formatChordName } from "../chord-processing/index.js";
	import type { ParsedProgressionChord } from "../chord-processing/types.js";
	import { simplifySuffix } from "../chord-processing/chord-classifier/fuzzySuffixMap.js";
	import { SEARCH_PLACEHOLDER } from "./constants.js";

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
			<span class="chip-wrapper" class:has-mini={isFuzzified(chord)}>
				{#if isFuzzified(chord)}
					<span class="mini-chip">{chord.display}</span>
				{/if}
				<span class="chip">{displayChordName(chord)}</span>
			</span>
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

	.chip-wrapper {
		position: relative;
		display: inline-flex;
	}

	.chip-wrapper.has-mini {
		margin-top: 0.625rem;
	}

	.mini-chip {
		position: absolute;
		top: 0;
		left: 0.25rem;
		transform: translateY(-100%);
		font-size: 0.55rem;
		background: rgba(67, 56, 202, 0.35);
		border: 1px solid rgba(99, 102, 241, 0.5);
		border-radius: 0.2rem;
		padding: 0.05rem 0.25rem;
		color: #a5b4fc;
		white-space: nowrap;
		line-height: 1.3;
	}
</style>
