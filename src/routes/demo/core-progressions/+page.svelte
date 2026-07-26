<script lang="ts">
	import { allProgressionGroups, type ProgressionGroup } from "$data/core-progressions.js";
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import SongCorpusFilterToggles from "../../../chord-search-demo/SongCorpusFilterToggles.svelte";
	import { createAllSongsCoverageState } from "../define-chord-progression/compute-coverage-of-all-songs/createAllSongsCoverageState.svelte.js";
	import { filterCoverageResultForProgressions } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
	import ProgressionGroupSection from "./ProgressionGroupSection.svelte";

	const coverage = createAllSongsCoverageState();

	const groupMatchCount = (group: ProgressionGroup): number => {
		const result = coverage.allSongsCoverageResult;
		if (!result) return 0;
		const keys = group.progressions.map((p) => p.chordProgression);
		return filterCoverageResultForProgressions(result, keys).songCoverages.length;
	};

	const sortedGroups = $derived.by(() => {
		if (!coverage.allSongsCoverageResult) return allProgressionGroups;
		return [...allProgressionGroups].sort(
			(a, b) => groupMatchCount(b) - groupMatchCount(a)
		);
	});

	let pinnedProgression = $state<string | null>(null);
	let selectedSongKey = $state("");

	function handleSelectProgression(p: string) {
		pinnedProgression = pinnedProgression === p ? null : p;
	}

	function handleSelectSong(key: string) {
		selectedSongKey = key;
		window.open(`/demo/define-chord-progression/?song=${key}`, "_blank");
	}
</script>

<svelte:head>
	<title>harmony — core progressions</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
	/>
</svelte:head>

<div class="page" style="--top-nav-height: {TOP_NAV_HEIGHT};">
	<TopNavBar showSearch={false} />

	<div class="content">
		<div class="page-header">
			<h1 class="page-title">Core progressions</h1>
			<p class="page-subtitle">
				Coverage of each progression group across the song corpus. Click a
				progression to highlight matching songs in the beeswarm.
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
			{#if coverage.loading}
				<span class="status-text">Loading song dataset…</span>
			{:else if coverage.loadingFullSongs}
				<span class="status-text">Loading full song dataset…</span>
			{:else if coverage.loadError}
				<span class="status-text error">{coverage.loadError}</span>
			{:else}
				<span class="status-text">{coverage.baseList.length.toLocaleString()} songs</span>
			{/if}
		</div>

		<div class="groups">
			{#each sortedGroups as group (group.name)}
				<ProgressionGroupSection
					{group}
					coverageResult={coverage.allSongsCoverageResult}
					{pinnedProgression}
					{selectedSongKey}
					onSelectProgression={handleSelectProgression}
					onSelectSong={handleSelectSong}
				/>
			{/each}
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
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		padding-top: var(--top-nav-height);
	}

	.content {
		padding: 1.5rem 12px 2rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
		width: 100%;
		max-width: 56rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	.page-header {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.page-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
		color: #f4f4f5;
	}

	.page-subtitle {
		font-size: 0.8125rem;
		color: #71717a;
		margin: 0;
		line-height: 1.5;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.status-text {
		font-size: 0.75rem;
		color: #71717a;
	}

	.status-text.error {
		color: #fca5a5;
	}

	.groups {
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}
</style>
