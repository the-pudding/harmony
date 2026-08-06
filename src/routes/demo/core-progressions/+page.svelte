<script lang="ts">
	import coreProgressions, {
		allProgressionGroups,
		type ProgressionGroup
	} from "$data/core-progressions.js";
	import {
		chordProgressionVariants,
		siblingVariantsForProgression
	} from "$data/core-progressions.util.js";
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import SongCorpusFilterToggles from "../../../chord-search-demo/SongCorpusFilterToggles.svelte";
	import { createAllSongsCoverageState } from "../define-chord-progression/compute-coverage-of-all-songs/createAllSongsCoverageState.svelte.js";
	import { filterCoverageResultForProgressions } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
	import { openDefineChordProgressionSong } from "../shared/defineChordProgressionSongUrl.js";
	import ProgressionGroupSection from "./ProgressionGroupSection.svelte";
	import PotentialCoreProgressionsTable from "./PotentialCoreProgressionsTable.svelte";
	import { buildPotentialCoreProgressions } from "./buildPotentialCoreProgressions.js";
	import type { YearDomain } from "../shared/artists/artistStats.js";

	type Tab = "core" | "potential";

	const coverage = createAllSongsCoverageState();

	let activeTab = $state<Tab>("core");

	const songByKey = $derived(
		new Map(coverage.baseList.map((song) => [song.songKey, song]))
	);

	const yearDomain = $derived.by((): YearDomain | null => {
		const years = coverage.baseList.flatMap((song) =>
			song.year === undefined ? [] : [song.year]
		);
		return years.length === 0
			? null
			: { min: Math.min(...years), max: Math.max(...years) };
	});

	const groupMatchCount = (group: ProgressionGroup): number => {
		const result = coverage.allSongsCoverageResult;
		if (!result) return 0;
		const keys = group.progressions.flatMap((p) =>
			chordProgressionVariants(p.chordProgression)
		);
		return filterCoverageResultForProgressions(result, keys).songCoverages
			.length;
	};

	const sortedGroups = $derived.by(() => {
		if (!coverage.allSongsCoverageResult) return allProgressionGroups;
		return [...allProgressionGroups].sort(
			(a, b) => groupMatchCount(b) - groupMatchCount(a)
		);
	});

	const potentialRows = $derived.by(() => {
		if (!coverage.allSongsCoverageResult) return [];
		return buildPotentialCoreProgressions(coverage.allSongsCoverageResult);
	});

	const totalSongs = $derived(coverage.allSongsCoverageResult?.songCoverages.length ?? 0);

	let pinnedProgression = $state<string | null>(null);
	let selectedSongKey = $state("");

	function handleSelectProgression(p: string) {
		const siblings = siblingVariantsForProgression(coreProgressions, p);
		pinnedProgression =
			pinnedProgression !== null && siblings.includes(pinnedProgression)
				? null
				: p;
	}

	function handleSelectSong(key: string) {
		selectedSongKey = key;
		openDefineChordProgressionSong(key);
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
		</div>

		<div class="controls">
			<SongCorpusFilterToggles
				showRecentOnly={coverage.showRecentOnly}
				onRecentChange={coverage.handleRecentToggleChange}
			/>
			{#if coverage.loading}
				<span class="status-text">Loading song dataset…</span>
			{:else if coverage.loadingFullSongs}
				<span class="status-text">Loading full song dataset…</span>
			{:else if coverage.loadError}
				<span class="status-text error">{coverage.loadError}</span>
			{:else}
				<span class="status-text"
					>{coverage.baseList.length.toLocaleString()} songs</span
				>
			{/if}
		</div>

		<div class="tab-bar" role="tablist">
			<button
				class="tab"
				class:tab-active={activeTab === "core"}
				role="tab"
				aria-selected={activeTab === "core"}
				onclick={() => (activeTab = "core")}
			>
				Core progressions
			</button>
			<button
				class="tab"
				class:tab-active={activeTab === "potential"}
				role="tab"
				aria-selected={activeTab === "potential"}
				onclick={() => (activeTab = "potential")}
			>
				Potential core progressions
			</button>
		</div>

		{#if activeTab === "core"}
			<div class="groups">
				{#each sortedGroups as group (group.name)}
					<ProgressionGroupSection
						{group}
						coverageResult={coverage.allSongsCoverageResult}
						songByKey={songByKey}
						yearDomain={yearDomain}
						{pinnedProgression}
						{selectedSongKey}
						onSelectProgression={handleSelectProgression}
						onSelectSong={handleSelectSong}
					/>
				{/each}
			</div>
		{:else}
			<PotentialCoreProgressionsTable rows={potentialRows} {totalSongs} />
		{/if}
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
		max-width: 80rem;
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

	.tab-bar {
		display: flex;
		gap: 0.25rem;
		border-bottom: 1px solid rgba(63, 63, 70, 0.7);
		margin-bottom: -0.5rem;
	}

	.tab {
		border: none;
		border-bottom: 2px solid transparent;
		background: transparent;
		color: #71717a;
		font-family: inherit;
		font-size: 0.75rem;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		transition:
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.tab:hover {
		color: #d4d4d8;
	}

	.tab-active {
		color: #f4f4f5;
		border-bottom-color: #6366f1;
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
