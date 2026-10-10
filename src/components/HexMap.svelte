<script lang="ts">
	// The hex map from /demo/embedding on its own: no settings bar, legend or
	// inspector. Loads the songs, runs coverage and UMAP, and fills its parent.
	// Interaction can be turned off for decorative uses (e.g. a background).
	import { createAllSongsCoverageState } from "$routes/demo/define-chord-progression/compute-coverage-of-all-songs/createAllSongsCoverageState.svelte.js";
	import { createEmbeddingState } from "$routes/demo/harmony-map/embedding/state/createEmbeddingState.svelte.js";
	import {
		DEFAULT_SONG_VECTOR_OPTIONS,
		type SongVectorOptions
	} from "$routes/demo/harmony-map/embedding/vectors/constants.js";
	import { groupSharesForSong } from "$routes/demo/harmony-map/embedding/vectors/index.js";
	import { buildClusterInputPoints } from "$routes/demo/harmony-map/embedding/clustering/clusterInputPoints.js";
	import { findDensityClusters } from "$routes/demo/harmony-map/embedding/clustering/densityClusters.js";
	import { applyPurityRadialLayout } from "$routes/demo/harmony-map/embedding/layout/purityRadialLayout.js";
	import type { ClusterRegion } from "$routes/demo/harmony-map/embedding/layout/hexBins.js";
	import { homogeneityColorFor } from "$routes/demo/harmony-map/homogeneityColors.js";
	import {
		computeSongHomogeneity,
		effectiveProgressionCountFor
	} from "$routes/demo/shared/progressionHomogeneity.js";
	import { untrack } from "svelte";
	import { fade } from "svelte/transition";
	import EmbeddingScatter from "$routes/demo/harmony-map/components/EmbeddingScatter.svelte";
	import type { ScatterPoint } from "$routes/demo/harmony-map/components/scatterPoint.js";

	type Props = {
		// Wheel, pinch and double-click zoom.
		zoomable?: boolean;
		// Drag to move the map.
		pannable?: boolean;
		// Hover tooltips and click-to-zoom on hexes.
		interactive?: boolean;
		// Region labels, all at once.
		showLabels?: boolean;
		// Region labels fading in and out one at a time, a few seconds apart.
		showRotatingLabels?: boolean;
		// "dark" draws on a near-black background; "light" has no background
		// of its own and uses lighter grays between colored hexes.
		theme?: "dark" | "light";
		// Same meanings and defaults as /demo/embedding.
		purityLayout?: boolean;
		pureThreshold?: number;
		// Read once when the map mounts; changing it later has no effect.
		umapMinDist?: number;
		clusterMinPoints?: number;
		clusterMaxPoints?: number;
		clusterMinProgressionShare?: number;
	};

	const {
		zoomable = true,
		pannable = true,
		interactive = true,
		showLabels = true,
		showRotatingLabels = false,
		theme = "dark",
		purityLayout = true,
		pureThreshold = 0.9,
		umapMinDist = 0.05,
		clusterMinPoints = 20,
		clusterMaxPoints = 300,
		clusterMinProgressionShare = 0.25
	}: Props = $props();

	const VECTOR_OPTIONS: SongVectorOptions = {
		...DEFAULT_SONG_VECTOR_OPTIONS,
		weighting: "chords",
		useTfIdf: false,
		l2Normalize: true,
		weightChorus: false
	};

	const NO_SONG_KEYS = new Set<string>();

	const coverage = createAllSongsCoverageState();

	const embedding = createEmbeddingState({
		getEntries: () => coverage.allSongsCoverageResult?.songCoverages ?? null,
		getSongs: () => coverage.baseList,
		getCoverageCacheKey: () => coverage.coverageCacheKey,
		initialMethod: "umap",
		initialUmapMinDist: untrack(() => umapMinDist)
	});

	embedding.setOptions(VECTOR_OPTIONS);
	embedding.setDimension(2);

	const songCoverages = $derived(
		coverage.allSongsCoverageResult?.songCoverages ?? []
	);

	const songByKey = $derived(
		new Map(coverage.baseList.map((song) => [song.songKey, song]))
	);

	const homogeneityBySongKey = $derived(
		new Map(
			songCoverages.map((entry) => [
				entry.songKey,
				computeSongHomogeneity(entry.progressionCounts)
			])
		)
	);

	const points = $derived.by((): ScatterPoint[] =>
		songCoverages.flatMap((entry) => {
			const coords = embedding.result.coordsByKey.get(entry.songKey);
			if (!coords) return [];
			return [
				{
					songKey: entry.songKey,
					x: coords.x,
					y: coords.y,
					groupShares: groupSharesForSong(entry.progressionCounts),
					homogeneityColor: homogeneityColorFor(
						effectiveProgressionCountFor(entry.progressionCounts)
					)
				}
			];
		})
	);

	// The progression most of a cluster's songs are built on, and the share
	// of its songs that have it as their own main progression.
	const mainProgressionOf = (
		songKeys: readonly string[]
	): { name: string; share: number } | null => {
		const counts = new Map<string, number>();
		for (const songKey of songKeys) {
			const name = homogeneityBySongKey.get(songKey)?.dominantProgressionName;
			if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
		}
		const [name, count] =
			[...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ??
			[];
		return name === undefined || count === undefined || songKeys.length === 0
			? null
			: { name, share: count / songKeys.length };
	};

	// Only clusters with a clear main progression, named after it.
	const clusters = $derived(
		findDensityClusters(
			buildClusterInputPoints(points),
			clusterMinPoints,
			clusterMaxPoints
		).flatMap((cluster) => {
			const main = mainProgressionOf(cluster.songKeys);
			return main && main.share >= clusterMinProgressionShare
				? [{ cluster, name: main.name }]
				: [];
		})
	);

	const densityClusters = $derived(clusters.map(({ cluster }) => cluster));

	const clusterNames = $derived(
		new Map(clusters.map(({ cluster, name }) => [cluster.hash, name]))
	);

	const clusterRegionBySongKey = $derived.by(() => {
		const regions = new Map<string, ClusterRegion>();
		for (const { cluster, name } of clusters) {
			const region = { id: cluster.hash, name };
			for (const songKey of cluster.songKeys) regions.set(songKey, region);
		}
		return regions;
	});

	const progressionSharesBySongKey = $derived(
		new Map(
			[...homogeneityBySongKey].map(([songKey, homogeneity]) => [
				songKey,
				homogeneity?.progressionShares ?? []
			])
		)
	);

	const displayPoints = $derived(
		purityLayout
			? applyPurityRadialLayout(
					points,
					densityClusters,
					new Map(
						[...homogeneityBySongKey].map(([songKey, homogeneity]) => [
							songKey,
							homogeneity?.dominantShare ?? 0
						])
					),
					{ pureThreshold }
				)
			: points
	);
</script>

<div class="hex-map" class:dark={theme === "dark"}>
	{#if displayPoints.length > 0}
		<div class="fade-wrap" in:fade={{ duration: 500 }}>
			<EmbeddingScatter
				points={displayPoints}
				{songByKey}
				selectedSongKey={null}
				coClusterSongKeys={NO_SONG_KEYS}
				highlightedSongKeys={NO_SONG_KEYS}
				method={embedding.method}
				clusters={densityClusters}
				emphasizedClusterHashes={null}
				renderMode="hex"
				{progressionSharesBySongKey}
				{clusterRegionBySongKey}
				{clusterNames}
				{zoomable}
				{pannable}
				{interactive}
				{showLabels}
				{showRotatingLabels}
				{theme}
				onSelect={() => {}}
			/>
		</div>
	{/if}
</div>

<style>
	.hex-map {
		width: 100%;
		height: 100%;
	}

	.fade-wrap {
		width: 100%;
		height: 100%;
	}

	.hex-map.dark {
		background: #09090b;
	}
</style>
