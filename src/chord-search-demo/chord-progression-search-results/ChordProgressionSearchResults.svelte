<script lang="ts">
	import ChordProgressionSearchResult from "./ChordProgressionSearchResult.svelte";
	import { chordSearchDemoStore } from "../chordSearchDemoStore.svelte.js";
	import {
		CLEAR_CHORDS_LABEL,
		CLEAR_SENTINEL_NOTES,
		NO_MATCH_MESSAGE,
		PAUSE_SENTINEL_NOTES,
		SEARCH_INPUT_ACTIVE_LABEL,
		SEARCH_INPUT_PAUSED_LABEL,
		SEARCH_PLACEHOLDER
	} from "../constants.js";
</script>

<section class="card">
	<div class="head">
		<span
			class="action-pill"
			class:active={chordSearchDemoStore.searchInputActive}
			class:paused={!chordSearchDemoStore.searchInputActive}
		>
			{chordSearchDemoStore.searchInputActive
				? SEARCH_INPUT_ACTIVE_LABEL
				: SEARCH_INPUT_PAUSED_LABEL}
			<span class="shortcut">· play {PAUSE_SENTINEL_NOTES}</span>
		</span>
		<button type="button" class="action-pill clear" onclick={chordSearchDemoStore.clearSearch}>
			{CLEAR_CHORDS_LABEL}
			<span class="shortcut">· play {CLEAR_SENTINEL_NOTES} or <kbd>esc</kbd></span>
		</button>
	</div>
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
			{#each chordSearchDemoStore.searchResults as result (result.song.id)}
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

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.action-pill {
		flex-shrink: 0;
		font-size: 0.625rem;
		font-weight: 500;
		text-transform: lowercase;
		letter-spacing: 0.02em;
		padding: 0.125rem 0.375rem;
		border-radius: 9999px;
		border: 1px solid transparent;
		white-space: nowrap;
		font-family: inherit;
		line-height: inherit;
	}

	.action-pill.active {
		color: #4ade80;
		border-color: rgba(74, 222, 128, 0.35);
		background: rgba(74, 222, 128, 0.08);
	}

	.action-pill.paused {
		color: #a1a1aa;
		border-color: rgba(161, 161, 170, 0.35);
		background: rgba(161, 161, 170, 0.08);
	}

	.action-pill.clear {
		cursor: pointer;
		color: #fca5a5;
		border-color: rgba(252, 165, 165, 0.35);
		background: rgba(252, 165, 165, 0.08);
		transition:
			color 0.15s,
			border-color 0.15s,
			background 0.15s;
	}

	.action-pill.clear:hover {
		color: #fecaca;
		border-color: rgba(254, 202, 202, 0.45);
		background: rgba(252, 165, 165, 0.14);
	}

	.shortcut {
		opacity: 0.75;
		text-transform: none;
	}

	.action-pill kbd {
		font-family: inherit;
		font-size: inherit;
		font-weight: inherit;
		text-transform: inherit;
		letter-spacing: inherit;
		padding: 0;
		border: none;
		background: none;
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
		max-height: 18rem;
		overflow-y: auto;
	}

	.empty {
		color: #71717a;
		font-style: italic;
		margin: 0;
	}
</style>
