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
	import {
		featuredSongKeys,
		hasFeaturedSongs
	} from "$data/featuredClusters.js";
	import type { ChordColorSegment } from "$runes/audio.svelte.js";
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
		// Called when a sample's dot is clicked (to play it), or with null
		// when a click should stop what's playing.
		onSampleClick?: (songKey: string | null) => void;
		// The sample playing, drawn bigger with the others faded.
		playingSongKey?: string | null;
		// How far through the playing song's clip it is, 0 to 1; draws a
		// progress ring and pause icon on its dot.
		playingClipProgressFraction?: number;
		// Colors the progress ring in stretches, e.g. by chord.
		playingChordColorSegments?: ChordColorSegment[];

		// The rest only apply while the map is explorable (movable, with no
		// focusCluster).
		// The cluster the user picked, by name: the view fits it (in
		// focusFrame) without locking it, and at dot zoom its title is left
		// to its player (see onExploredTitleAnchor).
		exploredClusterName?: string | null;
		// A song picked in search, which the view zooms in on instead.
		searchedSongKey?: string | null;
		// Called when the user picks a cluster: its hex, its title, or a dot
		// in it (with that song), or null for a stray click.
		onClusterPick?: (
			clusterName: string | null,
			songKey: string | null
		) => void;
		// Called whenever the user pans or zooms.
		onUserMove?: () => void;
		// Called with a plain song's key when it's clicked at dot zoom, to
		// open or close its full chords.
		onSongChordsToggle?: (songKey: string) => void;
		// The song whose chords are open, which gets the selected look.
		chordsSongKey?: string | null;
		// A song hovered outside the map (e.g. in a beeswarm), shown as if
		// hovered here.
		linkedSongKey?: string | null;
		// Called with the song the pointer hovers on the map, or null.
		onSongHover?: (songKey: string | null) => void;
		// Called with where the explored cluster's title goes at dot zoom
		// (its top center, in viewport pixels), or null when it isn't titled
		// on screen.
		onExploredTitleAnchor?: (anchor: { x: number; y: number } | null) => void;
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
		onSampleClick = undefined,
		playingSongKey = null,
		playingClipProgressFraction = 0,
		playingChordColorSegments = [],
		exploredClusterName = null,
		searchedSongKey = null,
		onClusterPick = undefined,
		onUserMove = undefined,
		onSongChordsToggle = undefined,
		chordsSongKey = null,
		linkedSongKey = null,
		onSongHover = undefined,
		onExploredTitleAnchor = undefined,
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
				{
					title: snapshot!.titles[index],
					artists: snapshot!.artists[index],
					year: snapshot!.years?.[index] || undefined
				}
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
				outlinedSongKeys={featuredSongKeys}
				outlinedTitlePrefix="🎧"
				{playingSongKey}
				{playingClipProgressFraction}
				{playingChordColorSegments}
				movable={explorable}
				{hoverable}
				showLabels={labelsVisible && !rotateLabels}
				showRotatingLabels={labelsVisible && rotateLabels}
				labelNames={showLabels ?? null}
				showClusterNames={labelsVisible}
				{focusClusterName}
				selectedClusterName={explorable ? exploredClusterName : null}
				zoomSongKey={explorable ? searchedSongKey : null}
				{focusFrame}
				offsetY={centered || focusCluster !== undefined
					? 0
					: UNCENTERED_OFFSET_Y}
				{theme}
				simpleSongTooltip
				hexHasPlayableSongs={explorable ? hasFeaturedSongs : null}
				onSongChordsToggle={explorable ? onSongChordsToggle : null}
				openSongId={explorable ? chordsSongKey : null}
				onSelect={() => {}}
				onTransformChange={(transform) => (viewTransform = transform)}
				onOutlinedSongClick={onSampleClick}
				onClusterClick={explorable ? onClusterPick : null}
				onUserMove={explorable ? onUserMove : null}
				onProgressionColors={(colors) => (mapColors.byProgression = colors)}
				onSongColors={(colorOf) => (mapColors.bySong = colorOf)}
				{linkedSongKey}
				onSongHover={onSongHover ?? null}
				mergedTitleClusterName={explorable ? exploredClusterName : null}
				onMergedTitleAnchor={onExploredTitleAnchor ?? null}
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
