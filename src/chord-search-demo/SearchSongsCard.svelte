<script lang="ts">
	import SearchProgression from "./SearchProgression.svelte";
	import SongResultCard from "./SongResultCard.svelte";
	import type { ParsedProgressionChord, SongSearchResult } from "../chord-processing/types.js";
	import { NO_MATCH_MESSAGE, SEARCH_PLACEHOLDER } from "./constants.js";

	let {
		searchChords,
		results,
		hasSearch,
		onClear
	}: {
		searchChords: ParsedProgressionChord[];
		results: SongSearchResult[];
		hasSearch: boolean;
		onClear: () => void;
	} = $props();
</script>

<section class="card">
	<div class="head">
		<h2>Search Songs by Chord</h2>
		<button type="button" class="clear" onclick={onClear}>Clear search (or hit escape)</button>
	</div>
	<p class="hint">
		Play chords in any key — matches by chord type and intervals between roots, not absolute
		pitch.
	</p>
	<SearchProgression chords={searchChords} />
	<div class="results">
		{#if !hasSearch}
			<p class="empty">{SEARCH_PLACEHOLDER}</p>
		{:else if results.length === 0}
			<p class="empty">{NO_MATCH_MESSAGE}</p>
		{:else}
			{#each results as result (result.song.title + result.song.artist)}
				<SongResultCard {result} />
			{/each}
		{/if}
	</div>
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

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
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

	.clear {
		flex-shrink: 0;
		background: #27272a;
		border: 1px solid rgba(127, 29, 29, 0.6);
		color: #fca5a5;
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.375rem 0.75rem;
		border-radius: 0.25rem;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s,
			color 0.15s;
	}

	.clear:hover {
		background: rgba(69, 10, 10, 0.8);
		border-color: #dc2626;
		color: #fecaca;
	}

	.hint {
		font-size: 0.75rem;
		color: #71717a;
		line-height: 1.5;
		margin: 0;
	}

	.results {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		font-size: 0.75rem;
		max-height: 18rem;
		overflow-y: auto;
	}

	.empty {
		color: #71717a;
		font-style: italic;
		margin: 0;
	}
</style>
