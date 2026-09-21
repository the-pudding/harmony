<script lang="ts">
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import { createAllSongsCoverageState } from "../define-chord-progression/compute-coverage-of-all-songs/createAllSongsCoverageState.svelte.js";
	import { createEmbeddingState } from "../harmony-map/embedding/state/createEmbeddingState.svelte.js";
	import { buildClusterInputPoints } from "../harmony-map/embedding/clustering/clusterInputPoints.js";
	import { findDensityClusters } from "../harmony-map/embedding/clustering/densityClusters.js";
	import { resolveClusterNames, getNamedClusters } from "../harmony-map/components/namedClusters.js";
	import { buildWorldPoints, type EmbeddingPoint } from "./embeddingWorldPoints.js";
	import { computeNamedClusterOutlines } from "./mapClusters.js";
	import { computeShareByYear } from "./shareByYear.js";
	import { toCalendarYear } from "../../../data/songYear.js";
	import ChartSizeControls from "./ChartSizeControls.svelte";
	import PannableMap from "./PannableMap.svelte";
	import ShareOverTimeChart from "./ShareOverTimeChart.svelte";

	const DOT_RADIUS = 2.5;
	const WORLD_SIZE = 1800;
	const DOT_COLOR = "rgba(24, 24, 27, 0.35)";
	const OUTLINE_PADDING = 15;
	const SHARE_CHART_COLOR = "cornflowerblue";
	const DEFAULT_CLUSTER_NAME = "doo wop";

	let mapWidth = $state(300);
	let mapHeight = $state(700);
	let showLabels = $state(true);
	let shareChartWidth = $state(700);
	let shareChartHeight = $state(300);
	let selectedClusterName = $state<string | null>(null);

	const coverage = createAllSongsCoverageState();

	// Full-corpus UMAP embedding — the same technique used on
	// /demo/harmony-map — computed once over every song.
	const embedding = createEmbeddingState({
		getEntries: () => coverage.allSongsCoverageResult?.songCoverages ?? null,
		getSongs: () => coverage.baseList,
		getCoverageCacheKey: () => coverage.coverageCacheKey,
		initialMethod: "umap"
	});

	const ready = $derived(coverage.allSongsCoverageResult !== null);
	const embeddingReady = $derived(embedding.status === "ready");

	const rawPoints = $derived.by((): EmbeddingPoint[] => {
		if (!embeddingReady) return [];
		const points: EmbeddingPoint[] = [];
		for (const song of coverage.baseList) {
			const coords = embedding.result.coordsByKey.get(song.songKey);
			if (coords) points.push({ songKey: song.songKey, x: coords.x, y: coords.y });
		}
		return points;
	});

	const worldPoints = $derived(buildWorldPoints(rawPoints, WORLD_SIZE));

	// Same DBSCAN clustering + named-cluster resolution used on
	// /demo/harmony-map, so every cluster that has a name there gets labeled
	// here too.
	const clusterInputPoints = $derived(
		buildClusterInputPoints(rawPoints.map((p) => ({ ...p, groupShares: [] })))
	);
	const densityClusters = $derived(findDensityClusters(clusterInputPoints));
	const clusterNameByHash = $derived(resolveClusterNames(densityClusters, getNamedClusters()));
	const namedClusterOutlines = $derived(
		computeNamedClusterOutlines(densityClusters, clusterNameByHash, worldPoints, OUTLINE_PADDING)
	);

	// -- Share-over-time chart: % of songs each year in a chosen cluster -----
	const availableClusterNames = $derived(
		[...new Set(clusterNameByHash.values())].sort((a, b) => a.localeCompare(b))
	);

	$effect(() => {
		if (selectedClusterName !== null || availableClusterNames.length === 0) return;
		selectedClusterName = availableClusterNames.includes(DEFAULT_CLUSTER_NAME)
			? DEFAULT_CLUSTER_NAME
			: availableClusterNames[0];
	});

	const selectedClusterSongKeys = $derived.by(() => {
		if (selectedClusterName === null) return new Set<string>();
		const cluster = densityClusters.find(
			(c) => clusterNameByHash.get(c.hash) === selectedClusterName
		);
		return new Set(cluster?.songKeys ?? []);
	});

	const clusterShareByYear = $derived(
		computeShareByYear(
			coverage.baseList
				.filter((song) => song.year !== undefined)
				.map((song) => ({
					year: toCalendarYear(song.year!),
					matched: selectedClusterSongKeys.has(song.songKey)
				}))
		)
	);
</script>

<svelte:head>
	<title>harmony — viz</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
	/>
</svelte:head>

<div class="page" style="--top-nav-height: {TOP_NAV_HEIGHT};">
	<TopNavBar showSearch={false} />

	<div class="content">
		<div class="page-header">
			<h1 class="page-title">Viz</h1>
			<p class="page-subtitle">A pannable, zoomable view of the harmony map's UMAP clusters</p>
		</div>

		<div class="controls">
			{#if coverage.loading}
				<span class="status-text">Loading song dataset…</span>
			{:else if coverage.loadError}
				<span class="status-text error">{coverage.loadError}</span>
			{:else if !ready}
				<span class="status-text">Computing coverage…</span>
			{:else if !embeddingReady}
				<span class="status-text">Computing embedding…</span>
			{:else}
				<span class="status-text"
					>{worldPoints.length.toLocaleString()} songs, {namedClusterOutlines.length} named clusters
					— drag to pan, scroll to zoom</span
				>
			{/if}
			<label class="toggle">
				<input type="checkbox" bind:checked={showLabels} />
				show cluster labels
			</label>
		</div>

		<section class="chart-section">
			<ChartSizeControls bind:width={mapWidth} bind:height={mapHeight} />
			{#if embeddingReady}
				<PannableMap
					points={worldPoints}
					width={mapWidth}
					height={mapHeight}
					worldSize={WORLD_SIZE}
					radius={DOT_RADIUS}
					color={DOT_COLOR}
					outlines={namedClusterOutlines}
					{showLabels}
					title="Harmony map UMAP clusters"
				/>
			{/if}
		</section>

		<section class="chart-section">
			<div class="section-header">
				<h2 class="chart-title">Cluster prevalence over time</h2>
				<label class="cluster-select">
					<span>cluster:</span>
					<select bind:value={selectedClusterName} disabled={availableClusterNames.length === 0}>
						{#each availableClusterNames as name (name)}
							<option value={name}>{name}</option>
						{/each}
					</select>
				</label>
			</div>
			<p class="chart-description">
				% of songs each year that belong to the selected UMAP cluster.
			</p>
			<ChartSizeControls bind:width={shareChartWidth} bind:height={shareChartHeight} />
			{#if embeddingReady && selectedClusterName !== null}
				<ShareOverTimeChart
					points={clusterShareByYear}
					width={shareChartWidth}
					height={shareChartHeight}
					color={SHARE_CHART_COLOR}
					title="Share of songs in the {selectedClusterName} cluster, by year"
				/>
			{/if}
		</section>
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
		background: #fffefc;
		color: #18181b;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		padding-top: var(--top-nav-height);
	}

	.content {
		padding: 1.5rem 12px 4rem;
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
		width: 100%;
		max-width: 60rem;
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
		color: #18181b;
	}

	.page-subtitle {
		margin: 0;
		font-size: 0.8rem;
		color: #52525b;
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
		color: #dc2626;
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: #52525b;
		cursor: pointer;
	}

	.chart-section {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.625rem;
		max-width: 100%;
	}

	.chart-title {
		font-size: 0.95rem;
		font-weight: 600;
		margin: 0;
		color: #18181b;
	}

	.chart-description {
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.5;
		color: #52525b;
		max-width: 42rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.cluster-select {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: #52525b;
	}

	.cluster-select select {
		font-family: inherit;
		font-size: 0.75rem;
		color: #18181b;
		background: #fffefc;
		border: 1px solid rgba(0, 0, 0, 0.15);
		border-radius: 0.25rem;
		padding: 0.15rem 0.35rem;
	}
</style>
