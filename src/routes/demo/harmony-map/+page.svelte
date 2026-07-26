<script lang="ts">
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import SongCorpusFilterToggles from "../../../chord-search-demo/SongCorpusFilterToggles.svelte";
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import { allProgressionGroups } from "$data/core-progressions.js";
	import { createAllSongsCoverageState } from "../define-chord-progression/compute-coverage-of-all-songs/createAllSongsCoverageState.svelte.js";
	import { buildProgressionNetwork } from "$data/progression-network.js";
	import ForceGraph from "./ForceGraph.svelte";

	const coverage = createAllSongsCoverageState();

	const networkData = $derived.by(() => {
		const result = coverage.allSongsCoverageResult;
		const songs = result?.songCoverages ?? [];
		return buildProgressionNetwork(allProgressionGroups, songs);
	});

	const statusText = $derived.by(() => {
		if (coverage.loading) return "Loading song dataset…";
		if (coverage.loadingFullSongs) return "Loading full song dataset…";
		if (coverage.loadError) return coverage.loadError;
		return `${coverage.baseList.length.toLocaleString()} songs`;
	});

	const isError = $derived(Boolean(coverage.loadError));
</script>

<svelte:head>
	<title>harmony — harmony map</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
	/>
</svelte:head>

<div class="page" style="--top-nav-height: {TOP_NAV_HEIGHT};">
	<TopNavBar showSearch={false} />

	<div class="page-body">
		<div class="header">
			<div class="header-left">
				<h1 class="page-title">Harmony map</h1>
				<p class="page-subtitle">
					Force graph of progression groups, core progressions, and songs. Drag to explore, scroll to zoom.
				</p>
			</div>

			<div class="controls">
				<SongCorpusFilterToggles
					showPopularOnly={coverage.showPopularOnly}
					onPopularChange={coverage.handlePopularToggleChange}
					requireMultipleSections={coverage.requireMultipleSections}
					onRequireMultipleSectionsChange={
						coverage.handleRequireMultipleSectionsToggleChange
					}
				/>
				<span class="status-text" class:error={isError}>{statusText}</span>
			</div>
		</div>

		<div class="graph-wrap">
		{#if coverage.allSongsCoverageResult}
			<ForceGraph data={networkData} songs={coverage.baseList} />
			{:else}
				<div class="loading-overlay">
					<span class="loading-text">
						{coverage.loading || coverage.loadingFullSongs
							? "Loading songs…"
							: "Computing coverage…"}
					</span>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	:global(body > header) {
		display: none;
	}

	:global(body) {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}

	.page {
		background: #09090b;
		color: #f4f4f5;
		height: 100vh;
		display: flex;
		flex-direction: column;
		padding-top: var(--top-nav-height);
		overflow: hidden;
	}

	.page-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		padding: 1rem 0 0;
		gap: 0.75rem;
		box-sizing: border-box;
	}

	.header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1.5rem;
		flex-wrap: wrap;
		flex-shrink: 0;
		padding: 0 1.25rem;
	}

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.page-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
		color: #f4f4f5;
	}

	.page-subtitle {
		font-size: 0.75rem;
		color: #71717a;
		margin: 0;
		line-height: 1.5;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-shrink: 0;
	}

	.status-text {
		font-size: 0.75rem;
		color: #71717a;
	}

	.status-text.error {
		color: #fca5a5;
	}

	.graph-wrap {
		flex: 1;
		min-height: 0;
		overflow: hidden;
		position: relative;
	}

	.loading-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.loading-text {
		font-size: 0.75rem;
		color: #52525b;
	}
</style>
