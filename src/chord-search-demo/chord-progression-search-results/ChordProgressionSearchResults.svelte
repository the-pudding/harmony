<script lang="ts">
	import ChordProgressionSearchResult from "./ChordProgressionSearchResult.svelte";
	import { chordSearchDemoStore } from "../chordSearchDemoStore.svelte.js";
	import { NO_MATCH_MESSAGE, SEARCH_PLACEHOLDER } from "../constants.js";
</script>

<section class="card">
	<p class="hint">
		Key agnostic, just matches intervals
	</p>
	<div class="results">
		{#if chordSearchDemoStore.searchResults.length === 0}
			<p class="empty">
				{chordSearchDemoStore.hasSearch ? NO_MATCH_MESSAGE : SEARCH_PLACEHOLDER}
			</p>
		{:else}
			<p class="results-label">
				Sorted by popularity:
			</p>
			{#each chordSearchDemoStore.searchResults as result (result.songKey)}
				<ChordProgressionSearchResult {result} />
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

	.hint {
		font-size: 0.75rem;
		color: #71717a;
		line-height: 1.5;
		margin: 0;
	}

	.results-label {
		font-size: 0.625rem;
		color: #52525b;
		margin: 0;
		text-transform: lowercase;
		letter-spacing: 0.02em;
	}

	.results {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		font-size: 0.75rem;
		max-height: 24rem;
		overflow-y: auto;
	}

	.empty {
		color: #71717a;
		font-style: italic;
		margin: 0;
	}
</style>
