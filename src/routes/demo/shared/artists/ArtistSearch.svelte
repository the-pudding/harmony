<script lang="ts">
	import { searchArtistSummaries, type ArtistSummary } from "./artistStats.js";

	const MAX_RESULTS = 12;

	type Props = {
		summaries: ArtistSummary[];
		selectedArtistName: string | null;
		onSelect: (artistName: string | null) => void;
		placeholder?: string;
	};

	const {
		summaries,
		selectedArtistName,
		onSelect,
		placeholder = "Search artists…"
	}: Props = $props();

	let query = $state("");

	const results = $derived(
		searchArtistSummaries(summaries, query, MAX_RESULTS)
	);

	const selectArtist = (artistName: string) => {
		onSelect(artistName);
		query = "";
	};
</script>

<div class="artist-search">
	<div class="search-row">
		<input
			class="search-input"
			type="search"
			{placeholder}
			bind:value={query}
		/>
		{#if selectedArtistName !== null}
			<button class="clear-button" onclick={() => onSelect(null)}>
				clear filter
			</button>
		{/if}
	</div>

	{#if results.length > 0}
		<ul class="results">
			{#each results as summary (summary.artistName)}
				<li>
					<button
						class="result"
						class:result-active={summary.artistName === selectedArtistName}
						onclick={() => selectArtist(summary.artistName)}
					>
						<span class="result-name">{summary.artistName}</span>
						<span class="result-count">{summary.songCount} songs</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.artist-search {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.search-row {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.search-input {
		flex: 1;
		min-width: 0;
		box-sizing: border-box;
		padding: 0.375rem 0.5rem;
		border-radius: 0.375rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		background: rgba(9, 9, 11, 0.8);
		color: #f4f4f5;
		font-family: inherit;
		font-size: 0.75rem;
	}

	.clear-button {
		flex-shrink: 0;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.375rem;
		background: transparent;
		color: #a1a1aa;
		font-family: inherit;
		font-size: 0.65rem;
		padding: 0.3125rem 0.5rem;
		cursor: pointer;
	}

	.clear-button:hover {
		color: #f4f4f5;
		border-color: #52525b;
	}

	.results {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		z-index: 30;
		list-style: none;
		margin: 0.25rem 0 0;
		padding: 0.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		max-height: 14rem;
		overflow-y: auto;
		box-sizing: border-box;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.375rem;
		background: rgba(9, 9, 11, 0.97);
		backdrop-filter: blur(8px);
	}

	.result {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		padding: 0.25rem 0.375rem;
		border: none;
		border-radius: 0.25rem;
		background: rgba(63, 63, 70, 0.25);
		color: #d4d4d8;
		font-family: inherit;
		font-size: 0.7rem;
		text-align: left;
		cursor: pointer;
	}

	.result:hover,
	.result-active {
		background: rgba(99, 102, 241, 0.25);
		color: #f4f4f5;
	}

	.result-count {
		color: #71717a;
		flex-shrink: 0;
	}
</style>
