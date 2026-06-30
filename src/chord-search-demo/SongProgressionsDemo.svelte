<script lang="ts">
	import { onMount } from "svelte";
	import ChordProgressionCriteria from "./ChordProgressionCriteria.svelte";
	import PercentOfAllSongs from "./PercentOfAllSongs.svelte";
	import AllSongsWithProgressions from "./AllSongsWithProgressions.svelte";
	import TopNavBar from "./top-nav-bar/TopNavBar.svelte";
	import { chordSearchDemoStore } from "./chordSearchDemoStore.svelte.js";
	import {
		CHORD_SEARCH_DEMO_HORIZONTAL_MARGIN_PX,
		SONGS_DATA_URL,
		SONGS_LOAD_ERROR_PREFIX,
		SONGS_LOADING_MESSAGE
	} from "./constants.js";

	let songsLoading = $state(true);
	let songsError = $state("");

	onMount(() => {
		const loadSongs = async () => {
			try {
				const response = await fetch(SONGS_DATA_URL);
				if (!response.ok) {
					throw new Error(`${SONGS_LOAD_ERROR_PREFIX} HTTP ${response.status}`);
				}
				await chordSearchDemoStore.setSongs(await response.json());
			} catch (err) {
				songsError = err instanceof Error ? err.message : String(err);
			} finally {
				songsLoading = false;
			}
		};

		void loadSongs();

		return () => {
			chordSearchDemoStore.disposeWorkers();
		};
	});
</script>

<div
	class="page"
	style="--demo-h-margin: {CHORD_SEARCH_DEMO_HORIZONTAL_MARGIN_PX}px;"
>
	<TopNavBar showSearch={false} />

	<div class="demo">
		{#if songsLoading}
			<p class="dataset-status">{SONGS_LOADING_MESSAGE}</p>
		{:else if songsError}
			<p class="dataset-status error">{songsError}</p>
		{/if}

		<div class="columns">
			<div class="sidebar">
				<ChordProgressionCriteria />
			</div>
			<div class="main">
				<AllSongsWithProgressions />
			</div>
		</div>
	</div>
</div>

<style>
	:global(body) {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}

	.page {
		background: #09090b;
		color: #f4f4f5;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		padding-top: 3.25rem;
	}

	.demo {
		padding: 1.5rem var(--demo-h-margin, 12px) 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		width: 100%;
		box-sizing: border-box;
	}

	.dataset-status {
		font-size: 0.75rem;
		color: #71717a;
		margin: 0;
	}

	.dataset-status.error {
		color: #fca5a5;
	}

	.sidebar {
		position: sticky;
		top: 3.25rem;
		align-self: start;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
		z-index: 1000;
	}

	.main {
		min-width: 0;
	}
</style>
