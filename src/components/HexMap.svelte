<script lang="ts">
	// The story's hex map: no settings bar, legend or
	// inspector. Draws the prebuilt snapshot from `npm run hexmap` (positions
	// progression coverage and clusters) and fills its parent; layout runs
	// here, since it depends on the props below.
	import {
		loadHexMapSnapshot,
		loadShardedSong,
		type HexMapSnapshot
	} from "$data/hexMapSnapshot.js";
	import { namedClustersFromSnapshot } from "$data/hexMapClusters.js";
	import type { ClusterRegion } from "$components/hexmap/embedding/layout/hexBins.js";
	import type { ProgressionCoverage } from "$routes/demo/shared/progressionHomogeneity.js";
	import {
		featuredSongKeys,
		featuredSongsOf,
		hasFeaturedSongs
	} from "$data/featuredClusters.js";
	import { sameClusterName } from "$data/clusterName.js";
	import type { ChordColorSegment } from "$runes/audio.svelte.js";
	import { mapColors } from "$runes/mapColors.svelte.js";
	import { onMount, untrack } from "svelte";
	import { fade } from "svelte/transition";
	import { zoomIdentity, type ZoomTransform } from "d3";
	import EmbeddingScatter from "$components/hexmap/components/EmbeddingScatter.svelte";
	import { buildSongTable } from "$components/storymap/songTable.js";
	import { computeLayout } from "$components/storymap/layouts/cache.js";
	import { revealStagger as rippleFrom } from "$components/storymap/revealStagger.js";
	import { revealStages } from "$components/storymap/revealStages.js";
	import {
		DEFAULT_FOCUS_SCALE,
		SONG_FOCUS_SCALE
	} from "$components/hexmap/components/scatter/constants.js";
	import {
		frameRect,
		NO_MAP_FRAME
	} from "$components/hexmap/components/scatter/viewport.js";
	import type { MapFrame } from "$components/hexmap/components/scatter/types.js";
	import {
		DEFAULT_MAP_SCENE,
		type MapScene
	} from "$components/storymap/mapScene.js";
	// DEV-ONLY-REMOVE-BEFORE-PUBLISH (dev layout): see src/utils/perfParam.js.
	import { readLayoutParam } from "$utils/perfParam";

	type Props = {
		// Media settings are converted to spotlitSongKey and litSongKeys by Index.
		scene?: MapScene;
		// Skip animating changes to camera, layout and shown songs.
		instantFocus?: boolean;
		// The part of the map, in pixels from its top, that a focused cluster
		// is zoomed to almost fill the height of and centered in.
		focusFrame?: { top: number; height: number } | null;
		// Insets in pixels for rect-framed layouts; UMAP isn't framed.
		mapFrame?: MapFrame;
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
		// A song picked in search: spotlit, and when it isn't in the explored
		// cluster (or none is explored), the view zooms in on it instead.
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
		// Enlarged and labeled without fading the rest; wins over searchedSongKey.
		spotlitSongKey?: string | null;
		// Small inert markers with no labels, kept bright on a dimmed scene.
		litSongKeys?: readonly string[];
		// Called with true while the scene's staged reveal (revealClusters)
		// plays, and false once its hexes are in.
		onStagedRevealChange?: (running: boolean) => void;
		// Called with where the explored cluster's title goes at dot zoom
		// (its top center, in viewport pixels), or null when it isn't titled
		// on screen.
		onExploredTitleAnchor?: (anchor: { x: number; y: number } | null) => void;
		// Where marks of songs anchored by a slide are drawn (see songDots).
		pinCanvas?: HTMLCanvasElement | null;
		// (UMAP's minDist and
		// the cluster settings are baked into the snapshot; see
		// HEX_MAP_UMAP_MIN_DIST and hexMapClusters.ts.)
		purityLayout?: boolean;
		pureThreshold?: number;
	};

	const {
		scene = DEFAULT_MAP_SCENE,
		instantFocus = false,
		focusFrame = null,
		mapFrame = NO_MAP_FRAME,
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
		spotlitSongKey = null,
		litSongKeys = [],
		onStagedRevealChange = undefined,
		onExploredTitleAnchor = undefined,
		pinCanvas = null,
		purityLayout = true,
		pureThreshold = 0.9
	}: Props = $props();

	const focusCluster = $derived(
		scene.camera.kind === "cluster" ? scene.camera.name : undefined
	);
	const centered = $derived(
		scene.camera.kind === "home" && scene.camera.centered
	);
	const movable = $derived(scene.interaction.movable);
	// Stays clickable without hovering, or its songs couldn't be played.
	const hoverable = $derived(
		scene.interaction.hoverable || scene.songs.playable.length > 0
	);
	const hideLabels = $derived(scene.labels.hidden);
	const showLabels = $derived(scene.labels.only ?? undefined);
	const rotateLabels = $derived(scene.labels.rotate);
	const hidePlayer = $derived(scene.player.hidden);
	const highlightSongs = $derived(scene.songs.highlighted);

	const focusSongKey = $derived(
		scene.camera.kind === "song" ? scene.camera.songKey : undefined
	);

	// After a first focus the home camera zooms out (null) instead of undefined;
	// undefined while on a song, which the scatter would rank second to the cluster.
	let hasEverFocused = false;
	const focusClusterName = $derived.by(() => {
		if (focusCluster !== undefined || focusSongKey !== undefined) {
			hasEverFocused = true;
		}
		if (focusSongKey !== undefined || scene.camera.kind === "stay") {
			return undefined;
		}
		return focusCluster ?? (hasEverFocused ? null : undefined);
	});

	// A focused cluster locks the view. Derived rather than a prop default,
	// since defaults are only evaluated once and focusCluster changes over
	// the life of the map.
	const explorable = $derived(movable && focusCluster === undefined);

	// A focused cluster drawn without its player: no featured songs, no clicks.
	const playerHidden = $derived(hidePlayer && focusCluster !== undefined);

	// Focused cluster's featured songs, else the scene's own, else (UMAP only)
	// every featured song; ~50 large markers would cover other layouts.
	const playableSongKeys = $derived.by(() => {
		if (focusCluster !== undefined) {
			return playerHidden
				? new Set<string>()
				: new Set(featuredSongsOf(focusCluster).map(({ songKey }) => songKey));
		}
		if (scene.songs.playable.length > 0) return new Set(scene.songs.playable);
		return layoutName === "umap" ? featuredSongKeys : new Set<string>();
	});

	const litSongKeySet = $derived(new Set(litSongKeys));

	const highlightedSongKeys = $derived(
		new Set([...highlightSongs, ...litSongKeys])
	);

	// highlightSongs are drawn the same, but aren't playable unless featured.
	const outlinedSongKeys = $derived(
		playableSongKeys.size + highlightedSongKeys.size === 0
			? null
			: new Set([...playableSongKeys, ...highlightedSongKeys])
	);
	const inertOutlinedSongKeys = $derived(
		new Set(
			[...highlightedSongKeys].filter(
				(songKey) => !playableSongKeys.has(songKey)
			)
		)
	);

	const visibleSongKeys = $derived(
		scene.songs.only === null ? null : new Set(scene.songs.only)
	);

	const loneSongKey = $derived(
		scene.songs.only?.length === 1 ? scene.songs.only[0] : null
	);

	const dimExceptSongKeys = $derived(
		scene.songs.dimmed ? (outlinedSongKeys ?? new Set<string>()) : null
	);

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

	const songs = $derived(snapshot ? buildSongTable(snapshot) : null);

	// Each song's progression coverage, decoded from the snapshot's columns.
	const coverageBySongKey = $derived(
		songs?.coverageBySongKey ?? new Map<string, ProgressionCoverage[]>()
	);

	// A song needs at least this much of the explored cluster's progression
	// to be lit up when it sits outside the cluster's outline.
	const OUTSIDE_HUB_MIN_COVERAGE_PERCENT = 40;

	// The explored cluster's songs that the outline misses: ones with a lot
	// of its progression that sit elsewhere on the map (e.g. a loose patch
	// next to the hub), lit in the cluster's color so "where does this
	// progression live?" isn't only answered by the outline.
	const outsideHub = $derived.by(() => {
		if (!explorable || exploredClusterName === null) return null;
		const explored = clusters.filter(({ name }) =>
			sameClusterName(name, exploredClusterName)
		);
		if (explored.length === 0) return null;
		const progressionNames = new Set(
			explored[0].progressionNames.map((name) => name.toLowerCase())
		);
		const members = new Set(
			explored.flatMap(({ cluster }) => cluster.songKeys)
		);
		const songKeys = new Set<string>();
		for (const [songKey, coverage] of coverageBySongKey) {
			if (members.has(songKey)) continue;
			const percent = coverage
				.filter(({ name }) => progressionNames.has(name.toLowerCase()))
				.reduce((sum, { coveragePercent }) => sum + coveragePercent, 0);
			if (percent >= OUTSIDE_HUB_MIN_COVERAGE_PERCENT) songKeys.add(songKey);
		}
		if (songKeys.size === 0) return null;
		return {
			songKeys,
			color:
				mapColors.byProgression.get(explored[0].progressionNames[0]) ??
				"#ffffff"
		};
	});

	const songSummaryByKey = $derived(songs?.songSummaryByKey ?? new Map());

	const homogeneityBySongKey = $derived(
		songs?.homogeneityBySongKey ?? new Map()
	);

	// Clusters named by progression, precomputed by `npm run hexmap` (see
	// hexMapClusters.ts).
	const clusters = $derived(
		snapshot ? namedClustersFromSnapshot(snapshot) : []
	);

	const densityClusters = $derived(clusters.map(({ cluster }) => cluster));

	// While a cluster is focused, only its songs (in every cluster by that
	// name) can be hovered.
	const hoverableSongKeys = $derived(
		focusCluster === undefined
			? null
			: new Set(
					clusters
						.filter(({ name }) => sameClusterName(name, focusCluster))
						.flatMap(({ cluster }) => cluster.songKeys)
				)
	);

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

	// The view frames the explored cluster when the searched song is in it;
	// otherwise (it's in no cluster, or featured under a name the map no
	// longer has) it zooms to the song itself.
	const searchZoomSongKey = $derived(
		searchedSongKey !== null &&
			!sameClusterName(
				exploredClusterName,
				clusterRegionBySongKey.get(searchedSongKey)?.name
			)
			? searchedSongKey
			: null
	);

	const progressionSharesBySongKey = $derived(
		new Map(
			[...homogeneityBySongKey].map(([songKey, homogeneity]) => [
				songKey,
				homogeneity?.progressionShares ?? []
			])
		)
	);

	// Only framed layouts recompute when this changes (see layouts/cache.ts).
	const layoutFrame = $derived.by(() => {
		const rect = frameRect({ width, height }, mapFrame);
		return { width: rect.width, height: rect.height };
	});

	// DEV-ONLY-REMOVE-BEFORE-PUBLISH (dev layout)
	const devLayout = readLayoutParam();
	const layoutName = $derived(
		devLayout === "umap" || devLayout === "timeline"
			? devLayout
			: scene.layout.name
	);
	// Not on other layouts (e.g. slide 0's lone star) or on an immovable map.
	const insetShown = $derived(
		viewTransform.k >= INSET_MIN_ZOOM && layoutName === "umap" && movable
	);

	const mainResult = $derived(
		songs
			? layoutName === "timeline"
				? computeLayout("timeline", {}, { songs, frame: layoutFrame })
				: computeLayout(
						layoutName === "offstage" ? "offstage" : "umap",
						{ purityLayout, pureThreshold },
						{ songs, frame: layoutFrame }
					)
			: null
	);

	// Ripple for songs.only going from one song to every song (reversed on the
	// way back); computed once per scene, null for any other change.
	let previousOnly: readonly string[] | null | undefined = undefined;
	const reveal = $derived.by(() => {
		const only = scene.songs.only;
		const before = previousOnly;
		previousOnly = only;
		if (!songs || before === undefined) return null;
		const lone = (list: readonly string[] | null) =>
			list !== null && list.length === 1 ? list[0] : null;
		const origin = lone(before) ?? lone(only);
		if (origin === null || lone(before) === lone(only)) return null;
		const originIndex = songs.indexOf.get(origin);
		const layout = untrack(() => mainResult);
		if (originIndex === undefined || !layout) return null;
		return {
			stagger: rippleFrom(songs, layout, originIndex, {
				frame: untrack(() => layoutFrame),
				order: lone(before) === origin ? "closestFirst" : "farthestFirst"
			}),
			originSongKey: origin
		};
	});

	const sceneRevealStages = $derived(
		songs ? revealStages(songs, scene.reveal.clusters) : null
	);

	const umapResult = $derived(
		songs
			? computeLayout(
					"umap",
					{ purityLayout, pureThreshold },
					{ songs, frame: layoutFrame }
				)
			: null
	);
</script>

<div
	class="hex-map"
	class:dark={theme === "dark"}
	bind:clientWidth={width}
	bind:clientHeight={height}
>
	{#if songs && umapResult && mainResult && songs.count > 0}
		<div class="fade-wrap" in:fade={{ duration: 500 }}>
			<EmbeddingScatter
				{songs}
				layout={mainResult}
				songByKey={NO_SONGS}
				{songSummaryByKey}
				loadSong={loadShardedSong}
				selectedSongKey={null}
				coClusterSongKeys={NO_SONG_KEYS}
				method="umap"
				clusters={densityClusters}
				emphasizedClusterHashes={null}
				{progressionSharesBySongKey}
				{clusterRegionBySongKey}
				{clusterNames}
				{outlinedSongKeys}
				{inertOutlinedSongKeys}
				smallOutlinedSongKeys={litSongKeySet}
				{hoverableSongKeys}
				outlinedTitlePrefix="🎧"
				{playingSongKey}
				{playingClipProgressFraction}
				{playingChordColorSegments}
				movable={explorable}
				{hoverable}
				clickable={!playerHidden}
				showLabels={labelsVisible && !rotateLabels}
				showRotatingLabels={labelsVisible && rotateLabels}
				labelNames={showLabels ?? null}
				showClusterNames={labelsVisible}
				{focusClusterName}
				{focusSongKey}
				focusScale={focusSongKey === undefined
					? DEFAULT_FOCUS_SCALE
					: SONG_FOCUS_SCALE}
				{instantFocus}
				{visibleSongKeys}
				{dimExceptSongKeys}
				revealStagger={reveal?.stagger ?? null}
				revealOriginSongKey={reveal?.originSongKey ?? null}
				revealStages={sceneRevealStages}
				onStagedRevealChange={onStagedRevealChange ?? null}
				selectedClusterName={explorable ? exploredClusterName : null}
				zoomSongKey={explorable ? searchZoomSongKey : null}
				spotlitSongKey={spotlitSongKey ??
					loneSongKey ??
					(explorable ? searchedSongKey : null)}
				spotlightFadesOthers={spotlitSongKey === null && loneSongKey === null}
				accentSongKeys={outsideHub?.songKeys ?? null}
				accentFillColor={outsideHub?.color ?? null}
				{focusFrame}
				{mapFrame}
				offsetY={centered || focusCluster !== undefined
					? 0
					: UNCENTERED_OFFSET_Y}
				{theme}
				simpleSongTooltip
				tooltipDetail={scene.interaction.tooltip}
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
				{pinCanvas}
			/>

			{#if width > 0 && height > 0}
				<div
					class="inset"
					class:visible={insetShown}
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
						<!-- Always the UMAP layout, so other layouts never redraw it. -->
						<EmbeddingScatter
							{songs}
							layout={umapResult}
							songByKey={NO_SONGS}
							selectedSongKey={null}
							coClusterSongKeys={NO_SONG_KEYS}
							method="umap"
							clusters={densityClusters}
							emphasizedClusterHashes={null}
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
