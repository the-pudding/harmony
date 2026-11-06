<script lang="ts">
	// The story's hex map: no settings bar, legend or
	// inspector. Draws the prebuilt snapshot from `npm run hexmap` (positions
	// progression coverage and clusters) and fills its parent; layout runs
	// here, since it depends on the props below. Interaction can
	// be turned off for decorative uses (e.g. a background), and focusCluster
	// frames a single cluster.
	import {
		loadHexMapSnapshot,
		loadShardedSong,
		type HexMapSnapshot
	} from "$data/hexMapSnapshot.js";
	import {
		decodeSnapshotCoverage,
		namedClustersFromSnapshot
	} from "$data/hexMapClusters.js";
	import { applyPurityRadialLayout } from "$components/hexmap/embedding/layout/purityRadialLayout.js";
	import type { ClusterRegion } from "$components/hexmap/embedding/layout/hexBins.js";
	import { homogeneityColorFor } from "$components/hexmap/homogeneityColors.js";
	import {
		computeSongHomogeneity,
		type ProgressionCoverage
	} from "$routes/demo/shared/progressionHomogeneity.js";
	import { featuredSyncedSongs } from "$data/syncedSongs.js";
	import { mapColors } from "$runes/mapColors.svelte.js";
	import { onMount } from "svelte";
	import { fade } from "svelte/transition";
	import { zoomIdentity, type ZoomTransform } from "d3";
	import EmbeddingScatter from "$components/hexmap/components/EmbeddingScatter.svelte";
	import type { ScatterPoint } from "$components/hexmap/components/scatterPoint.js";

	type Props = {
		// Drag, wheel, pinch and double-click zoom, and click-to-zoom on hexes.
		// Always off while focusCluster is set.
		movable?: boolean;
		// Hovering a colored hex outlines its cluster and names its
		// progression; at dot zoom, hovering a song shows its tooltip.
		hoverable?: boolean;
		// Hide every region label. Always hidden while focusCluster is set.
		hideLabels?: boolean;
		// Only label these clusters, by name (e.g. ["stay with me"]). By
		// default any cluster can be labeled, as space and zoom allow.
		showLabels?: string[];
		// Labels fade in and out a few at a time, a few seconds apart, instead
		// of all showing at once.
		rotateLabels?: boolean;
		// Zoom in on and center this cluster, by name (e.g. "stay with me").
		focusCluster?: string;
		// The part of the map, in pixels from its top, that a focused cluster
		// is zoomed to almost fill the height of and centered in.
		focusFrame?: { top: number; height: number } | null;
		// Center the map on the page. By default it sits a bit lower, to
		// leave room for text above it (panning can still move it under).
		// Always centered while focusCluster is set.
		centered?: boolean;
		// "dark" draws on a near-black background; "light" has no background
		// of its own and uses lighter grays between colored hexes.
		theme?: "dark" | "light";
		// Called when the map is clicked, with the synced song clicked on, or
		// null when the click missed them.
		onSongClick?: (songKey: string | null) => void;
		// The synced song playing, drawn bigger with the others faded.
		playingSongKey?: string | null;
		// While movable and no focusCluster is set: a cluster the user picked,
		// by name, which the view fits (in focusFrame) without locking it.
		selectedCluster?: string | null;
		// While movable and no focusCluster is set: a song the user picked,
		// which the view centers and zooms in on (in focusFrame) without
		// locking it. Takes priority over selectedCluster for moving the view.
		selectedSong?: string | null;
		// While movable and no focusCluster is set, called on every click
		// with the cluster clicked (or null for a gray hex or empty space)
		// and the synced song clicked, if any.
		onClusterClick?: (
			clusterName: string | null,
			songKey: string | null
		) => void;
		// While movable and no focusCluster is set, called whenever the user
		// pans or zooms.
		onUserMove?: () => void;
		// While movable and no focusCluster is set, called with a song's key
		// when the user clicks a song at dot zoom, to open its full chords.
		onSongOpen?: (songId: string) => void;
		// The song whose chords are open, which gets the selected look.
		openSongId?: string | null;
		// (UMAP's minDist and
		// the cluster settings are baked into the snapshot; see
		// HEX_MAP_UMAP_MIN_DIST and hexMapClusters.ts.)
		purityLayout?: boolean;
		pureThreshold?: number;
	};

	const {
		focusCluster = undefined,
		focusFrame = null,
		centered = false,
		movable = true,
		hoverable = true,
		hideLabels = false,
		showLabels = undefined,
		rotateLabels = false,
		theme = "dark",
		onSongClick = undefined,
		playingSongKey = null,
		selectedCluster = null,
		selectedSong = null,
		onClusterClick = undefined,
		onUserMove = undefined,
		onSongOpen = undefined,
		openSongId = null,
		purityLayout = true,
		pureThreshold = 0.9
	}: Props = $props();

	// Once a cluster has been focused, clearing focusCluster zooms back out
	// (null) instead of leaving the scatter's scripted zoom off (undefined).
	let hasFocusedCluster = false;
	const focusClusterName = $derived.by(() => {
		if (focusCluster !== undefined) hasFocusedCluster = true;
		return focusCluster ?? (hasFocusedCluster ? null : undefined);
	});

	// A focused cluster locks the view. Derived rather than a prop default,
	// since defaults are only evaluated once and focusCluster changes over
	// the life of the map.
	const explorable = $derived(movable && focusCluster === undefined);

	// A focused cluster isn't labeled.
	const labelsVisible = $derived(!hideLabels && focusCluster === undefined);

	// How far below center the map sits when not centered.
	const UNCENTERED_OFFSET_Y = 280;

	const NO_SONG_KEYS = new Set<string>();
	const NO_SONGS = new Map();

	// Featured synced songs: rows in reference.csv checked as visible.
	const SYNCED_SONG_KEYS = new Set(
		featuredSyncedSongs.map((row) => row.songKey)
	);

	// Featured songs per cluster (lowercased name), for the hex tooltip.
	const featuredCountByCluster = new Map<string, number>();
	for (const { cluster } of featuredSyncedSongs) {
		const name = cluster.toLowerCase();
		featuredCountByCluster.set(
			name,
			(featuredCountByCluster.get(name) ?? 0) + 1
		);
	}

	const hexClickHint = (regionName: string): string => {
		const count = featuredCountByCluster.get(regionName.toLowerCase()) ?? 0;
		return count === 0
			? "Click to zoom in (no playable songs available)"
			: `Click to start an audio tour of ${count} ${count === 1 ? "song" : "songs"} in this cluster`;
	};

	let snapshot = $state.raw<HexMapSnapshot | null>(null);

	// The inset is a second, unzoomed copy of the map drawn at full size and
	// scaled down, so its hexes look like the zoomed-out map and its pixels
	// line up with the main map's unzoomed (base) coordinates.
	const INSET_WIDTH = 120;
	// The inset fades in once the view is zoomed in at least this far.
	const INSET_MIN_ZOOM = 1.5;

	let width = $state(0);
	let height = $state(0);
	let viewTransform = $state.raw<ZoomTransform>(zoomIdentity);

	const insetScale = $derived(width > 0 ? INSET_WIDTH / width : 0);

	// The main view's corners in base coordinates, scaled into the inset and
	// clamped to it so the outline stays visible when panned past the edge.
	const viewRect = $derived.by(() => {
		const [left, top] = viewTransform.invert([0, 0]);
		const [right, bottom] = viewTransform.invert([width, height]);
		const clampX = (x: number) => Math.min(Math.max(x, 0), width);
		const clampY = (y: number) => Math.min(Math.max(y, 0), height);
		return {
			x: clampX(left) * insetScale,
			y: clampY(top) * insetScale,
			width: (clampX(right) - clampX(left)) * insetScale,
			height: (clampY(bottom) - clampY(top)) * insetScale
		};
	});

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
		snapshot.songKeys.forEach((songKey, index) => {
			coverages.set(songKey, decodeSnapshotCoverage(snapshot!, index));
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

	// Clusters named by progression, precomputed by `npm run hexmap` (see
	// hexMapClusters.ts).
	const clusters = $derived(
		snapshot ? namedClustersFromSnapshot(snapshot) : []
	);

	const densityClusters = $derived(clusters.map(({ cluster }) => cluster));

	const clusterNames = $derived(
		new Map(clusters.map(({ cluster, name }) => [cluster.hash, name]))
	);

	const clusterRegionBySongKey = $derived.by(() => {
		const regions = new Map<string, ClusterRegion>();
		for (const { cluster, name, progressionNames, showLabel } of clusters) {
			const region = { id: cluster.hash, name, progressionNames, showLabel };
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

<div
	class="hex-map"
	class:dark={theme === "dark"}
	bind:clientWidth={width}
	bind:clientHeight={height}
>
	{#if displayPoints.length > 0}
		<div class="fade-wrap" in:fade={{ duration: 500 }}>
			<EmbeddingScatter
				points={displayPoints}
				songByKey={NO_SONGS}
				{songSummaryByKey}
				loadSong={loadShardedSong}
				selectedSongKey={null}
				coClusterSongKeys={NO_SONG_KEYS}
				method="umap"
				clusters={densityClusters}
				emphasizedClusterHashes={null}
				renderMode="hex"
				{progressionSharesBySongKey}
				{clusterRegionBySongKey}
				{clusterNames}
				outlinedSongKeys={SYNCED_SONG_KEYS}
				outlinedTitlePrefix="🎧"
				{playingSongKey}
				movable={explorable}
				{hoverable}
				showLabels={labelsVisible && !rotateLabels}
				showRotatingLabels={labelsVisible && rotateLabels}
				labelNames={showLabels ?? null}
				showClusterNames={labelsVisible}
				{focusClusterName}
				selectedClusterName={explorable && !selectedSong
					? selectedCluster
					: null}
				zoomSongKey={explorable ? selectedSong : null}
				{focusFrame}
				offsetY={centered || focusCluster !== undefined
					? 0
					: UNCENTERED_OFFSET_Y}
				{theme}
				simpleSongTooltip
				hexClickHint={explorable ? hexClickHint : null}
				onSongOpen={explorable ? onSongOpen : null}
				openSongId={explorable ? openSongId : null}
				onSelect={() => {}}
				onTransformChange={(transform) => (viewTransform = transform)}
				onOutlinedSongClick={onSongClick}
				onClusterClick={explorable ? onClusterClick : null}
				onUserMove={explorable ? onUserMove : null}
				onProgressionColors={(colors) => (mapColors.byProgression = colors)}
			/>

			{#if width > 0 && height > 0}
				<div
					class="inset"
					class:visible={viewTransform.k >= INSET_MIN_ZOOM}
					aria-hidden="true"
					style:width="{width * insetScale}px"
					style:height="{height * insetScale}px"
				>
					<div
						class="inset-map"
						style:width="{width}px"
						style:height="{height}px"
						style:transform="scale({insetScale})"
					>
						<EmbeddingScatter
							points={displayPoints}
							songByKey={NO_SONGS}
							selectedSongKey={null}
							coClusterSongKeys={NO_SONG_KEYS}
							method="umap"
							clusters={densityClusters}
							emphasizedClusterHashes={null}
							renderMode="hex"
							{progressionSharesBySongKey}
							{clusterRegionBySongKey}
							{clusterNames}
							movable={false}
							hoverable={false}
							showLabels={false}
							pixelRatio={insetScale * (window.devicePixelRatio || 1)}
							{theme}
							onSelect={() => {}}
						/>
					</div>
					<div
						class="view-rect"
						style:left="{viewRect.x}px"
						style:top="{viewRect.y}px"
						style:width="{viewRect.width}px"
						style:height="{viewRect.height}px"
					></div>
				</div>
			{/if}
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

	.inset {
		position: fixed;
		bottom: 1rem;
		left: 1rem;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		background: #09090b;
		pointer-events: none;
		opacity: 0;
		transition: opacity 300ms ease;
	}

	.inset.visible {
		opacity: 1;
	}

	.hex-map:not(.dark) .inset {
		border-color: rgba(0, 0, 0, 0.2);
		background: white;
	}

	.inset-map {
		transform-origin: top left;
		filter: grayscale(1);
	}

	.view-rect {
		position: absolute;
		box-sizing: border-box;
		border: 1.5px solid white;
	}

	.hex-map:not(.dark) .view-rect {
		border-color: #18181b;
	}
</style>
