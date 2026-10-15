<script lang="ts">
	// The hex map from /demo/embedding on its own: no settings bar, legend or
	// inspector. Draws the prebuilt snapshot from `npm run hexmap` (positions
	// and progression coverage per song) and fills its parent; clustering and
	// layout run here, since they depend on the props below. Interaction can
	// be turned off for decorative uses (e.g. a background), and focusCluster
	// frames a single cluster.
	import {
		loadHexMapSnapshot,
		loadShardedSong,
		type HexMapSnapshot
	} from "$data/hexMapSnapshot.js";
	import { buildClusterInputPoints } from "$routes/demo/harmony-map/embedding/clustering/clusterInputPoints.js";
	import { findDensityClusters } from "$routes/demo/harmony-map/embedding/clustering/densityClusters.js";
	import { applyPurityRadialLayout } from "$routes/demo/harmony-map/embedding/layout/purityRadialLayout.js";
	import type { ClusterRegion } from "$routes/demo/harmony-map/embedding/layout/hexBins.js";
	import { homogeneityColorFor } from "$routes/demo/harmony-map/homogeneityColors.js";
	import {
		computeSongHomogeneity,
		type ProgressionCoverage
	} from "$routes/demo/shared/progressionHomogeneity.js";
	import { onMount } from "svelte";
	import { fade } from "svelte/transition";
	import EmbeddingScatter from "$routes/demo/harmony-map/components/EmbeddingScatter.svelte";
	import type { ScatterPoint } from "$routes/demo/harmony-map/components/scatterPoint.js";

	type Props = {
		// Drag, wheel, pinch and double-click zoom, and click-to-zoom on hexes.
		// Defaults to true, or false when focusCluster is set.
		movable?: boolean;
		// Hovering a colored hex outlines its cluster and names its
		// progression; at dot zoom, hovering a song shows its tooltip.
		hoverable?: boolean;
		// Hide every region label.
		hideLabels?: boolean;
		// Only label these clusters, by name (e.g. ["stay with me"]). By
		// default any cluster can be labeled, as space and zoom allow; when
		// focusCluster is set, only that cluster is.
		showLabels?: string[];
		// Labels fade in and out a few at a time, a few seconds apart, instead
		// of all showing at once.
		rotateLabels?: boolean;
		// Zoom in on and center this cluster, by name (e.g. "stay with me").
		focusCluster?: string;
		// "dark" draws on a near-black background; "light" has no background
		// of its own and uses lighter grays between colored hexes.
		theme?: "dark" | "light";
		// Same meanings and defaults as /demo/embedding. (UMAP's minDist is
		// baked into the snapshot; see HEX_MAP_UMAP_MIN_DIST.)
		purityLayout?: boolean;
		pureThreshold?: number;
		clusterMinPoints?: number;
		clusterMaxPoints?: number;
		clusterMinProgressionShare?: number;
	};

	const {
		focusCluster = undefined,
		movable = focusCluster === undefined,
		hoverable = true,
		hideLabels = false,
		showLabels = focusCluster === undefined ? undefined : [focusCluster],
		rotateLabels = false,
		theme = "dark",
		purityLayout = true,
		pureThreshold = 0.9,
		clusterMinPoints = 20,
		clusterMaxPoints = 300,
		clusterMinProgressionShare = 0.25
	}: Props = $props();

	const NO_SONG_KEYS = new Set<string>();
	const NO_SONGS = new Map();

	let snapshot = $state.raw<HexMapSnapshot | null>(null);

	onMount(() => {
		let active = true;
		void loadHexMapSnapshot().then((loaded) => {
			if (active) snapshot = loaded;
		});
		return () => {
			active = false;
		};
	});

	// Each song's progression coverage, decoded from the snapshot's columns.
	const coverageBySongKey = $derived.by(() => {
		const coverages = new Map<string, ProgressionCoverage[]>();
		if (!snapshot) return coverages;
		const { songKeys, progressions, progressionNames } = snapshot;
		songKeys.forEach((songKey, index) => {
			const flat = progressions[index];
			const entries: ProgressionCoverage[] = [];
			for (let at = 0; at < flat.length; at += 2) {
				entries.push({
					name: progressionNames[flat[at]],
					coveragePercent: flat[at + 1]
				});
			}
			coverages.set(songKey, entries);
		});
		return coverages;
	});

	const songSummaryByKey = $derived(
		new Map(
			(snapshot?.songKeys ?? []).map((songKey, index) => [
				songKey,
				{ title: snapshot!.titles[index], artists: snapshot!.artists[index] }
			])
		)
	);

	const homogeneityBySongKey = $derived(
		new Map(
			[...coverageBySongKey].map(([songKey, coverage]) => [
				songKey,
				computeSongHomogeneity(coverage)
			])
		)
	);

	// groupShares only colors plain-dot mode, which HexMap never uses.
	const points = $derived.by((): ScatterPoint[] =>
		(snapshot?.songKeys ?? []).map((songKey, index) => ({
			songKey,
			x: snapshot!.x[index],
			y: snapshot!.y[index],
			groupShares: [],
			homogeneityColor: homogeneityColorFor(
				homogeneityBySongKey.get(songKey)?.effectiveProgressionCount ?? null
			)
		}))
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
				songByKey={NO_SONGS}
				{songSummaryByKey}
				loadSong={loadShardedSong}
				selectedSongKey={null}
				coClusterSongKeys={NO_SONG_KEYS}
				highlightedSongKeys={NO_SONG_KEYS}
				method="umap"
				clusters={densityClusters}
				emphasizedClusterHashes={null}
				renderMode="hex"
				{progressionSharesBySongKey}
				{clusterRegionBySongKey}
				{clusterNames}
				{movable}
				{hoverable}
				showLabels={!hideLabels && !rotateLabels}
				showRotatingLabels={!hideLabels && rotateLabels}
				labelNames={showLabels ?? null}
				focusClusterName={focusCluster}
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
