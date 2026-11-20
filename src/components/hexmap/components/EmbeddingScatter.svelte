<script lang="ts">
	import { onDestroy, onMount, untrack } from "svelte";
	import { zoomIdentity, type ZoomTransform } from "d3";
	import { createDelayedHoverTooltip } from "../../../routes/demo/shared/delayedHoverTooltip.svelte.js";
	import { createClickAfterDragGuard } from "../../../routes/demo/shared/clickAfterDragGuard.js";
	import {
		anchorFromMouseEvent,
		hoverCardStyle,
		type HoverCardAnchor
	} from "../../../routes/demo/shared/hoverCardPosition.js";
	import {
		gradientStrengthForZoom,
		hexZoomLevel,
		type ClusterRegion
	} from "../embedding/layout/hexBins.js";
	import {
		HEX_ZOOM,
		HEX_LABEL_FONT,
		HEX_MIN_SHARE_FADE,
		DEFAULT_FOCUS_SCALE,
		HEX_FOCUS_SCALE,
		HEX_CLICK_ZOOM_MS,
		POINT_RADIUS,
		HOVER_PICK_RADIUS,
		OUTLINE_COLOR,
		OUTLINED_POINT_RADIUS,
		CLUSTERABLE_METHODS,
		HEX_THEME_COLORS,
		MAX_PIXEL_RATIO,
		TWEEN_DURATION_MS,
		FRAME_TWEEN_MS,
		DIMMED_SONG_ALPHA,
		SCRIPTED_FOCUS_TRANSITION_MS,
		HEX_FADE_IN_MS,
		HEX_FADE_OUT_MS
	} from "./scatter/constants.js";
	import type { EmbeddingScatterProps as Props } from "./scatter/props.js";
	import type {
		Guide,
		LayoutResult
	} from "$components/storymap/layouts/types.js";
	import type {
		ClusterHit,
		LabelSpot,
		MapFrame,
		Point2D,
		Position
	} from "./scatter/types.js";
	import HexRegionTooltip from "./scatter/HexRegionTooltip.svelte";
	import {
		datedBeeswarmSongs,
		yearDomainOf
	} from "$components/charts/beeswarmSongs.js";
	import RotatingLabels from "./scatter/RotatingLabels.svelte";
	import ClusterTitles from "./scatter/ClusterTitles.svelte";
	import {
		clusterTitleSpots,
		placeClusterTitles,
		type ClusterTitleSpot
	} from "./scatter/clusterTitles.js";
	import ScatterSongTooltip from "./scatter/ScatterSongTooltip.svelte";
	import { normalizeName } from "./scatter/clusterNames.js";
	import {
		createTransition,
		type TransitionTarget,
		type TransitionTiming
	} from "./scatter/transition.svelte.js";
	import { createFade } from "./scatter/fade.svelte.js";
	import { createSpotlightTween } from "./scatter/spotlightTween.svelte.js";
	import { createCamera } from "./scatter/camera.svelte.js";
	import { createRotatingLabels } from "./scatter/rotatingLabels.svelte.js";
	import { createTooltipSong } from "./scatter/tooltipSong.svelte.js";
	import {
		clusterAt,
		hexKeyAt,
		nearestIndexAt,
		nearestSongAt
	} from "./scatter/hitTesting.js";
	import { resolveClick, type ClickAction } from "./scatter/clickIntent.js";
	import { createPointStyle } from "./scatter/pointStyle.js";
	import {
		createScene,
		prepareCanvas,
		type Scene
	} from "./scatter/paint/scene.js";
	import {
		drawAxisLabels,
		drawGuides,
		guideOpacities,
		type GuideSet
	} from "./scatter/paint/guides.js";
	import { createMixFill } from "./scatter/colorMix.js";
	import { drawClusterOutlines } from "./scatter/paint/clusters.js";
	import {
		createDotFill,
		drawDots,
		drawSelectionRings
	} from "./scatter/paint/dots.js";
	import { drawMarkedSongs } from "./scatter/paint/markedSongs.js";
	import { drawOutlinedSongLabels } from "./scatter/paint/outlinedLabels.js";
	import {
		createHexLayoutCache,
		type HexLayout
	} from "./scatter/paint/hexLayout.js";
	import { drawHexes } from "./scatter/paint/hexes.js";
	import { drawHexRegionLabels } from "./scatter/paint/hexLabels.js";
	import * as view from "./scatter/viewport.js";
	import { songLinks } from "$data/songLinks.js";
	// DEV-ONLY-REMOVE-BEFORE-PUBLISH (perf meter): see src/utils/perfParam.js.
	import { readPerfParam, createPerfMeter } from "$utils/perfParam";
	import {
		colorsByProgressionName,
		createRegionFills,
		regionColorsByName,
		strayRegionsBySongKey,
		type RegionFills
	} from "./scatter/regionColors.js";

	const {
		songs,
		layout,
		songByKey,
		loadSong = null,
		songSummaryByKey = null,
		selectedSongKey,
		coClusterSongKeys,
		visibleSongKeys = null,
		dimExceptSongKeys = null,
		revealStagger = null,
		inYearSongKeys = null,
		axisLabels = null,
		method,
		clusters,
		emphasizedClusterHashes,
		onSelect,
		focusSongKey = undefined,
		focusScale = DEFAULT_FOCUS_SCALE,
		focusClusterName = undefined,
		instantFocus = false,
		selectedClusterName = null,
		zoomSongKey = null,
		openSongId = null,
		spotlitSongKey = null,
		focusFrame = null,
		offsetY = 0,
		mapFrame = view.NO_MAP_FRAME,
		emphasizedSongKeys = null,
		showClusterOutlines = true,
		showClusterNames = true,
		familyEmphasisSongKeys = null,
		emphasisFillColor = null,
		accentSongKeys = null,
		accentFillColor = null,
		outlinedSongKeys = null,
		outlinedTitlePrefix = null,
		inertOutlinedSongKeys = null,
		playingSongKey = null,
		playingClipProgressFraction = 0,
		playingChordColorSegments = [],
		hexStyle = "hex",
		progressionSharesBySongKey = null,
		clusterRegionBySongKey = null,
		clusterNames = null,
		movable = true,
		hoverable = true,
		clickable = true,
		hoverableSongKeys = null,
		showLabels = true,
		showRotatingLabels = false,
		labelNames = null,
		theme = "dark",
		onTransformChange = null,
		onOutlinedSongClick = null,
		onClusterClick = null,
		onUserMove = null,
		pixelRatio: pixelRatioOverride = null,
		simpleSongTooltip = false,
		hexHasPlayableSongs = null,
		onSongChordsToggle = null,
		onProgressionColors = null,
		onSongColors = null,
		linkedSongKey = null,
		onSongHover = null,
		mergedTitleClusterName = null,
		onMergedTitleAnchor = null
	}: Props = $props();

	const labelNameSet = $derived(
		labelNames === null ? null : new Set(labelNames.map(normalizeName))
	);

	const interactive = $derived(movable || hoverable);

	const hexColors = $derived(HEX_THEME_COLORS[theme]);

	let containerEl = $state<HTMLDivElement | null>(null);
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let width = $state(0);
	let height = $state(0);
	let transform = $state<ZoomTransform>(zoomIdentity);
	let hoveredSongKey = $state<string | null>(null);

	const delayedTooltip = createDelayedHoverTooltip();
	const clickGuard = createClickAfterDragGuard();
	onDestroy(() => delayedTooltip.dispose());

	let hoveredClusterHit = $state<ClusterHit | null>(null);

	// The colored hex under the pointer in hex mode and the cluster it
	// belongs to (gray hexes don't count), plus the bins and regions from
	// the last frame so hover can look them up without re-binning.
	let hoveredHex = $state<{
		key: string;
		anchor: HoverCardAnchor;
		region: ClusterRegion;
	} | null>(null);
	let hexFrame: HexLayout | null = null;

	const clusterSizeByHash = $derived(
		new Map(clusters.map((cluster) => [cluster.hash, cluster.songKeys.length]))
	);

	const maxClusterSongCount = $derived(
		Math.max(0, ...clusters.map((cluster) => cluster.songKeys.length))
	);

	const clusterSongKeysByHash = $derived(
		new Map(clusters.map((cluster) => [cluster.hash, cluster.songKeys]))
	);

	// Every dated song's release years, so each cluster's beeswarm shares
	// one time axis.
	const yearDomain = $derived(
		yearDomainOf(
			[...(songSummaryByKey?.values() ?? [])].map((summary) => summary.year)
		)
	);

	// Labels that fit on the current hex frame without overlapping, placed
	// like song positions (0–1 across the plot). Rotating labels are picked
	// from these.
	let labelSpots = $state<LabelSpot[]>([]);

	// In hex mode at dot zoom, each named cluster's title spot from the last
	// frame; titles are HTML (ClusterTitles), not painted.
	let titleSpots = $state.raw<ClusterTitleSpot[]>([]);
	const setTitleSpots = (spots: ClusterTitleSpot[]) => {
		if (spots.length === 0 && untrack(() => titleSpots.length) === 0) return;
		titleSpots = spots;
	};

	const placedTitles = $derived(
		placeClusterTitles(titleSpots, {
			width,
			height,
			mergedName: mergedTitleClusterName,
			bottom:
				focusFrame && focusFrame.height > 0
					? focusFrame.top + focusFrame.height
					: height
		})
	);

	// Where the merged cluster's player goes, in viewport pixels, reported
	// only when it moves (titles are re-placed on every frame drawn).
	let lastAnchor: { x: number; y: number } | null = null;
	$effect(() => {
		const { merged } = placedTitles;
		if (!onMergedTitleAnchor) return;
		const rect = merged && containerEl?.getBoundingClientRect();
		const anchor =
			merged && rect
				? { x: rect.left + merged.x, y: rect.top + merged.y }
				: null;
		if (anchor?.x === lastAnchor?.x && anchor?.y === lastAnchor?.y) return;
		lastAnchor = anchor;
		onMergedTitleAnchor(anchor);
	});

	// Canvas labels use web fonts, which may arrive after the first paint.
	let fontsLoaded = $state(0);
	onMount(() => {
		void document.fonts.load(HEX_LABEL_FONT).then(() => fontsLoaded++);
	});

	const resolvedClusterNames = $derived(
		clusterNames ?? new Map<string, string>()
	);

	// Each cluster outline from the last dot frame, so hover and click
	// hit-testing don't refit them on every mousemove.
	let clusterHits: ClusterHit[] = [];

	// The last layout that bins into hexes (or the first layout, before
	// one has). Region colors come from it, so hexes keep their colors while
	// they fade out for another layout, and come back the same.
	let lastHexLayout: LayoutResult | null = null;
	const regionLayout = $derived.by(() => {
		if (layout.aggregate === "hex") lastHexLayout = layout;
		return lastHexLayout ?? layout;
	});

	// Where that layout puts each song it places, by song key, for the
	// region colors (worked out once per layout, not per frame).
	const restingPoints = $derived.by(() => {
		const { x, y } = regionLayout;
		return songs.keys.flatMap((songKey, index) =>
			Number.isNaN(x[index]) || Number.isNaN(y[index])
				? []
				: [{ songKey, nx: x[index], ny: y[index] }]
		);
	});

	// 1 for every song that should be drawn, 0 for the ones visibleSongKeys
	// leaves out, DIMMED_SONG_ALPHA for the ones dimExceptSongKeys doesn't
	// keep bright; the transition fades between them.
	const targetAlpha = $derived.by(() => {
		const alpha = new Float32Array(songs.count);
		for (let index = 0; index < songs.count; index++) {
			const songKey = songs.keys[index];
			alpha[index] =
				visibleSongKeys !== null && !visibleSongKeys.has(songKey)
					? 0
					: dimExceptSongKeys !== null && !dimExceptSongKeys.has(songKey)
						? DIMMED_SONG_ALPHA
						: 1;
		}
		return alpha;
	});

	// Every song's color goal: its region color in a layout that colors by
	// region, star white in one that doesn't.
	const targetMix = $derived(
		new Float32Array(songs.count).fill(layout.color === "region" ? 1 : 0)
	);

	// Where every song is headed: where the layout puts it, across the
	// plot (a framed layout's 0–1 is converted from the frame rect), and
	// how visible, plus what it was placed for, so the transition can tell
	// a window resize or a frame change from a new layout.
	type PlacedTarget = TransitionTarget & {
		layoutName: string;
		// Whether the stagger is revealStagger.
		revealing: boolean;
		// Framed layouts only (null and 0 for the rest, which don't move
		// when these change).
		frame: MapFrame | null;
		width: number;
		height: number;
	};

	const transitionTarget = $derived.by((): PlacedTarget => {
		const placed = {
			alpha: targetAlpha,
			mix: targetMix,
			stagger: revealStagger ?? layout.stagger ?? null,
			revealing: revealStagger !== null,
			layoutName: layout.name
		};
		if (!layout.framed) {
			return {
				...placed,
				x: layout.x,
				y: layout.y,
				frame: null,
				width: 0,
				height: 0
			};
		}
		const size = { width, height };
		const x = new Float32Array(songs.count);
		const y = new Float32Array(songs.count);
		for (let index = 0; index < songs.count; index++) {
			const position = view.framedToPlot(size, mapFrame, {
				nx: layout.x[index],
				ny: layout.y[index]
			});
			x[index] = position.nx;
			y[index] = position.ny;
		}
		return { ...placed, x, y, frame: mapFrame, width, height };
	});

	const sameFrame = (a: MapFrame | null, b: MapFrame | null): boolean =>
		a === b ||
		(a !== null &&
			b !== null &&
			a.top === b.top &&
			a.right === b.right &&
			a.bottom === b.bottom &&
			a.left === b.left);

	// With instantFocus everything jumps, so a map that's about to appear
	// is already in place. A window resize jumps; a reveal (revealStagger)
	// moves with the scripted camera, also while it's retargeted mid-way
	// (e.g. the frame settling); a frame change within one layout moves
	// songs quickly; anything else (a new layout, songs shown or hidden) at
	// the usual pace. Hexes showing fade out (HEX_FADE_OUT_MS from fully
	// shown) before songs move out from under them.
	const transitionTiming = (
		next: PlacedTarget,
		previous: PlacedTarget | null
	): TransitionTiming => {
		if (instantFocus) return { durationMs: 0, instant: true };
		const delayMs =
			hexZoomLevel(transform.k, HEX_ZOOM).kind === "hex"
				? hexFade.current * HEX_FADE_OUT_MS
				: 0;
		const resized =
			previous !== null &&
			next.layoutName === previous.layoutName &&
			(next.width !== previous.width || next.height !== previous.height);
		if (
			next.revealing &&
			!resized &&
			(next.stagger !== previous?.stagger || !transition.settled)
		) {
			return { durationMs: SCRIPTED_FOCUS_TRANSITION_MS, delayMs };
		}
		if (previous && next.layoutName === previous.layoutName) {
			if (next.width !== previous.width || next.height !== previous.height) {
				return { durationMs: 0, instant: true };
			}
			if (!sameFrame(next.frame, previous.frame)) {
				return { durationMs: FRAME_TWEEN_MS, delayMs };
			}
		}
		return { durationMs: TWEEN_DURATION_MS, delayMs };
	};

	// A song the layout places and visibleSongKeys keeps, by index.
	const isDrawnIndex = (index: number | undefined): index is number =>
		index !== undefined &&
		targetAlpha[index] > 0 &&
		!Number.isNaN(transitionTarget.x[index]);

	const isDrawn = (songKey: string): boolean =>
		isDrawnIndex(songs.indexOf.get(songKey));

	// Where a song rests in this layout, in base pixels, or null.
	const restingBasePixel = (index: number | undefined): Point2D | null =>
		index === undefined || Number.isNaN(transitionTarget.x[index])
			? null
			: toBasePixel({
					nx: transitionTarget.x[index],
					ny: transitionTarget.y[index]
				});

	const isAccented = (songKey: string): boolean =>
		accentFillColor !== null && (accentSongKeys?.has(songKey) ?? false);

	// The layout bins songs into hexes when zoomed out (UMAP does).
	const hexMode = $derived(
		layout.aggregate === "hex" && progressionSharesBySongKey !== null
	);

	const regionColorByName = $derived(
		progressionSharesBySongKey === null || clusterRegionBySongKey === null
			? new Map<string, string>()
			: regionColorsByName(restingPoints, clusterRegionBySongKey)
	);

	const regionColorByProgressionName = $derived(
		colorsByProgressionName(clusterRegionBySongKey, regionColorByName)
	);

	$effect(() => {
		onProgressionColors?.(regionColorByProgressionName);
	});

	// A song's dot color at full zoom, as the beeswarms draw it.
	const fullZoomSongFill = (songKey: string) =>
		regionFills.songRegionFill(songKey, 1);

	// Unclustered songs inside a cluster's outline, colored with it.
	const strayRegionBySongKey = $derived(
		clusterRegionBySongKey === null ||
			progressionSharesBySongKey === null ||
			width === 0
			? null
			: strayRegionsBySongKey(
					restingPoints,
					clusterRegionBySongKey,
					progressionSharesBySongKey,
					(point) => view.toBasePixel({ width, height }, point)
				)
	);

	const regionFills = $derived(
		createRegionFills({
			colorByRegionName: regionColorByName,
			themeColors: hexColors,
			regionBySongKey: clusterRegionBySongKey,
			strayRegionBySongKey,
			sharesBySongKey: progressionSharesBySongKey
		})
	);

	// The hovered hex's cluster, as dated songs in their fully zoomed-in
	// dot colors, for the tooltip's beeswarm.
	const hoveredClusterSongs = $derived(
		hoveredHex && songSummaryByKey
			? datedBeeswarmSongs(
					clusterSongKeysByHash.get(hoveredHex.region.id) ?? [],
					(songKey) => songSummaryByKey.get(songKey),
					fullZoomSongFill
				)
			: []
	);

	$effect(() => {
		onSongColors?.(fullZoomSongFill);
	});

	const isOutlined = (songKey: string): boolean =>
		outlinedSongKeys?.has(songKey) ?? false;

	// Outlined and playable (not just drawn like it).
	const isPlayableOutlined = (songKey: string): boolean =>
		isOutlined(songKey) && !(inertOutlinedSongKeys?.has(songKey) ?? false);

	const playableOutlinedSongKeys = $derived(
		outlinedSongKeys && inertOutlinedSongKeys
			? new Set(
					[...outlinedSongKeys].filter(
						(songKey) => !inertOutlinedSongKeys.has(songKey)
					)
				)
			: outlinedSongKeys
	);

	// Song indexes in the layers dots are drawn in: accented songs last, so
	// they sit on top of the dots around them.
	const dotLayers = $derived.by(() => {
		const plain: number[] = [];
		const accented: number[] = [];
		for (let index = 0; index < songs.count; index++) {
			(isAccented(songs.keys[index]) ? accented : plain).push(index);
		}
		return [Int32Array.from(plain), Int32Array.from(accented)];
	});

	// Each cluster's songs by index, for drawing outlines every frame.
	const clusterMemberIndexes = $derived(
		clusters.map((cluster) =>
			cluster.songKeys.flatMap((songKey) => {
				const index = songs.indexOf.get(songKey);
				return index === undefined ? [] : [index];
			})
		)
	);

	const clustersAvailable = $derived(CLUSTERABLE_METHODS.has(method));

	// Framed layouts keep clear of the text with mapFrame instead.
	const viewSize = $derived({
		width,
		height,
		offsetY: layout.framed ? 0 : offsetY
	});
	const viewport = $derived({ ...viewSize, transform });
	const plot = $derived(view.plotSize(viewSize));

	const toBasePixel = (position: Position) =>
		view.toBasePixel(viewSize, position);
	const toScreen = (position: Position) => view.toScreen(viewport, position);
	const homeTransform = $derived(view.homeTransform(viewSize.offsetY));

	const spotlightSongKey = $derived(
		playingSongKey ?? openSongId ?? zoomSongKey ?? spotlitSongKey
	);

	let watercolorCanvas: HTMLCanvasElement | null = null;
	const watercolorLayer = (): HTMLCanvasElement => {
		watercolorCanvas ??= document.createElement("canvas");
		return watercolorCanvas;
	};

	const hexLayoutFor = createHexLayoutCache();

	// Drawing runs inside an effect, so this skips needless writes.
	const setLabelSpots = (spots: LabelSpot[]) => {
		if (spots.length === 0 && untrack(() => labelSpots.length) === 0) return;
		labelSpots = spots;
	};

	// Repaints the whole canvas from the current state. The effect below
	// re-runs it whenever anything it reads changes; the transition and the
	// spotlight tween also run it on each of their frames.
	// DEV-ONLY-REMOVE-BEFORE-PUBLISH (perf meter): the main map only, not the inset.
	const perfMeter = $derived(
		pixelRatioOverride === null && readPerfParam() ? createPerfMeter() : null
	);
	let perfEl = $state<HTMLPreElement | null>(null);
	let rotatingLabelsEl = $state<HTMLDivElement | null>(null);
	let drawnDots = 0;

	const draw = () => {
		const perfStart = perfMeter ? performance.now() : 0; // perf meter
		const pixelRatio =
			pixelRatioOverride ??
			Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1);
		const context =
			canvasEl && prepareCanvas(canvasEl, width, height, pixelRatio);
		if (!context) return;
		void fontsLoaded;
		const scene = createScene({
			context,
			viewport,
			x: transition.x,
			y: transition.y,
			alpha: transition.alpha,
			indexOf: songs.indexOf,
			themeColors: hexColors
		});
		drawAxisLabels(scene, axisLabels);
		drawGuides(scene, guideSets(), mapFrame);
		// At hex zoom, hexes cover the dots by hexOpacity: none while songs
		// move, all once they've settled in a hex layout, and crossfading
		// with the dots in between.
		const zoomLevel =
			hexMode || hexFade.current > 0
				? hexZoomLevel(transform.k, HEX_ZOOM)
				: null;
		const hexOpacity = zoomLevel?.kind === "hex" ? hexFade.current : 0;
		if (hexOpacity === 0) {
			hexFrame = null;
			setLabelSpots([]);
		}
		drawnDots = // perf meter
			hexOpacity < 1
				? drawDotFrame(
						hexOpacity === 0 ? scene : fadedScene(scene, 1 - hexOpacity),
						hexOpacity === 0
					)
				: 0;
		if (zoomLevel?.kind === "hex" && hexOpacity > 0) {
			drawHexFrame(scene, zoomLevel.radius, hexOpacity, pixelRatio);
		}
		context.globalAlpha = 1;
		const labelsOpacity = hexFade.current === 1 ? "" : String(hexFade.current);
		if (rotatingLabelsEl && rotatingLabelsEl.style.opacity !== labelsOpacity) {
			rotatingLabelsEl.style.opacity = labelsOpacity;
		}
		// perf meter
		if (perfMeter && perfEl) {
			const text = perfMeter.record(performance.now() - perfStart, drawnDots);
			if (text !== null) perfEl.textContent = text;
		}
	};

	// The layout's guides (axis labels...) and those of the layout before it,
	// which fade out as the songs start to move while the new ones fade in
	// as they arrive (see guideOpacities). Guides only change with the
	// layout's name, so a new frame size just updates them.
	const NO_GUIDES: readonly Guide[] = [];
	const guideSetList: GuideSet[] = [
		{ guides: NO_GUIDES, opacity: 0 },
		{ guides: NO_GUIDES, opacity: 0 }
	];
	let guideLayoutName: string | null = null;
	let guidesBefore = NO_GUIDES;
	let outgoingGuides = NO_GUIDES;
	const guideSets = (): readonly GuideSet[] => {
		if (guideLayoutName !== layout.name) {
			outgoingGuides = guidesBefore;
			guideLayoutName = layout.name;
		}
		guidesBefore = layout.guides;
		const { outgoing, incoming } = guideOpacities(transition.progress);
		if (outgoing === 0) outgoingGuides = NO_GUIDES;
		guideSetList[0].guides = outgoingGuides;
		guideSetList[0].opacity = outgoing;
		guideSetList[1].guides = layout.guides;
		guideSetList[1].opacity = incoming;
		return guideSetList;
	};

	// The same scene with every song's alpha scaled by opacity, in a buffer
	// kept across frames.
	let fadedAlpha = new Float32Array(0);
	const fadedScene = (scene: Scene, opacity: number): Scene => {
		const { alpha } = scene;
		if (fadedAlpha.length !== alpha.length) {
			fadedAlpha = new Float32Array(alpha.length);
		}
		for (let index = 0; index < alpha.length; index++) {
			fadedAlpha[index] = alpha[index] * opacity;
		}
		return { ...scene, alpha: fadedAlpha };
	};

	// Hexes fading in or out are painted here at full strength, then laid
	// over the canvas at their opacity, so overlapping hexes don't show
	// seams.
	let hexFadeCanvas: HTMLCanvasElement | null = null;

	// Zoomed out in hex mode: the binned map and its region labels, at
	// opacity over whatever's drawn below.
	const drawHexFrame = (
		mainScene: Scene,
		radius: number,
		opacity: number,
		pixelRatio: number
	) => {
		const fadeContext =
			opacity < 1
				? prepareCanvas(
						(hexFadeCanvas ??= document.createElement("canvas")),
						width,
						height,
						pixelRatio
					)
				: null;
		const scene = fadeContext
			? { ...mainScene, context: fadeContext }
			: mainScene;
		const layout = hexLayoutFor({
			radius,
			size: viewSize,
			songKeys: songs.keys,
			x: transition.x,
			y: transition.y,
			positionsVersion: transition.positionsVersion,
			visible: targetAlpha,
			regionBySongKey: clusterRegionBySongKey,
			sharesBySongKey: progressionSharesBySongKey
		});
		hexFrame = layout;
		setTitleSpots([]);
		drawHexes(scene, {
			layout,
			mode: hexStyle,
			regionFill: regionFills.regionFill,
			selectedSongKey,
			hoveredRegionId: hoveredHex?.region.id ?? null,
			watercolorLayer
		});
		setLabelSpots(
			showLabels || showRotatingLabels
				? drawHexRegionLabels(scene, {
						layout,
						draw: showLabels,
						isAllowed: (name) =>
							labelNameSet === null || labelNameSet.has(normalizeName(name))
					})
				: []
		);
		if (fadeContext && hexFadeCanvas) {
			mainScene.context.globalAlpha = opacity;
			mainScene.context.drawImage(hexFadeCanvas, 0, 0, width, height);
		}
	};

	// Colors between star white and each song's region color, for dots
	// moving between layouts that color differently.
	const mixFill = $derived(
		createMixFill((songKey) => regionFills.songRegionFill(songKey, 1))
	);

	// Each song's region fill at one gradient strength, kept across frames
	// while the fills and gradient hold (at dot zoom the gradient is
	// constant), so dots don't re-interpolate their colors every frame.
	let songFillCache: {
		fills: RegionFills | null;
		gradient: number;
		bySongKey: Map<string, string>;
	} = { fills: null, gradient: NaN, bySongKey: new Map() };
	const songRegionFillAt = (gradient: number) => {
		const fills = regionFills;
		if (songFillCache.fills !== fills || songFillCache.gradient !== gradient) {
			songFillCache = { fills, gradient, bySongKey: new Map() };
		}
		const { bySongKey } = songFillCache;
		return (songKey: string): string => {
			let fill = bySongKey.get(songKey);
			if (fill === undefined) {
				fill = fills.songRegionFill(songKey, gradient);
				bySongKey.set(songKey, fill);
			}
			return fill;
		};
	};

	// Dots (at any zoom in other layouts, at dot zoom in hex ones): cluster
	// outlines, dots, marked songs and their labels, then rings around the
	// selected and hovered songs. Cluster outlines and titles belong to the
	// hex map's dot zoom: they're left out in other layouts, under fading
	// hexes (when the dots aren't alone) and while songs move. Returns how
	// many plain dots it drew.
	const drawDotFrame = (scene: Scene, alone: boolean): number => {
		const outlined =
			showClusterOutlines && hexMode && alone && transition.settled;
		const gradient = hexMode
			? gradientStrengthForZoom(transform.k, HEX_ZOOM, HEX_MIN_SHARE_FADE)
			: 0;
		const songRegionFill = hexMode ? songRegionFillAt(gradient) : null;
		const style = createPointStyle({
			pointRadius: layout.pointRadius,
			spotlight: spotlight.current,
			outlinedSongKeys,
			hoveredSongKey,
			selectedSongKey,
			coClusterSongKeys,
			emphasizedSongKeys,
			inYearSongKeys
		});

		clusterHits = outlined
			? drawClusterOutlines(scene, {
					clusters,
					memberIndexes: clusterMemberIndexes,
					names: resolvedClusterNames,
					emphasizedClusterHashes,
					familyEmphasisSongKeys,
					// Hex maps title clusters in HTML instead (see titleSpots).
					showNames: showClusterNames && !hexMode,
					// Hex maps already show the count in the hex tooltip.
					countClusterHash: hexMode
						? null
						: (hoveredClusterHit?.cluster.hash ?? null)
				})
			: [];
		setTitleSpots(
			hexMode && showClusterNames && outlined
				? clusterTitleSpots(clusterHits, resolvedClusterNames)
				: []
		);

		const drawnDotCount = drawDots(scene, {
			layers: dotLayers,
			songKeys: songs.keys,
			style,
			fill: createDotFill({
				emphasisFillColor,
				emphasizedSongKeys,
				mix: transition.mix,
				// Settled in a hex layout, or on the way to one (hexMode), dots
				// take region colors at the zoom's gradient, and otherwise at
				// full strength.
				regionFill: songRegionFill ?? songRegionFillAt(1),
				mixFill,
				accentFillColor,
				isAccented
			})
		});

		drawMarkedSongs(scene, {
			style,
			innerFill: songRegionFill ?? (() => OUTLINE_COLOR),
			// only playable songs get the play icon on hover
			hoveredSongKey:
				hoveredSongKey !== null && isPlayableOutlined(hoveredSongKey)
					? hoveredSongKey
					: null,
			playingSongKey,
			playback: {
				progressFraction: playingClipProgressFraction,
				chordSegments: playingChordColorSegments
			}
		});

		if (outlinedSongKeys && songSummaryByKey) {
			drawOutlinedSongLabels(scene, {
				style,
				summaries: songSummaryByKey,
				titlePrefix: outlinedTitlePrefix,
				isPrefixed: isPlayableOutlined
			});
		}

		drawSelectionRings(
			scene,
			[selectedSongKey, hoveredSongKey].filter(
				(songKey): songKey is string => songKey !== null && isDrawn(songKey)
			),
			style
		);
		return drawnDotCount;
	};

	// Hit-testing against the last frame drawn.
	// Songs fading out (e.g. everyone but songs.only) can't be picked.
	const songScreen = (songKey: string): Point2D | null => {
		const index = songs.indexOf.get(songKey);
		if (!isDrawnIndex(index) || !(transition.alpha[index] > 0)) return null;
		return toScreen({ nx: transition.x[index], ny: transition.y[index] });
	};

	// The outlinedSongKeys song whose marker is under the anchor, give or
	// take the same slack plain dots get.
	const findOutlinedSongAt = (anchor: Point2D): string | null =>
		playableOutlinedSongKeys
			? nearestSongAt(
					anchor,
					playableOutlinedSongKeys,
					songScreen,
					OUTLINED_POINT_RADIUS + HOVER_PICK_RADIUS - POINT_RADIUS
				)
			: null;

	// Plain dots that can be hovered, by index.
	const pickableIndexes = $derived.by(() => {
		const indexes: number[] = [];
		for (let index = 0; index < songs.count; index++) {
			if (
				isDrawnIndex(index) &&
				(hoverableSongKeys?.has(songs.keys[index]) ?? true)
			) {
				indexes.push(index);
			}
		}
		return Int32Array.from(indexes);
	});

	const nearestPickableSongAt = (anchor: Point2D): string | null => {
		const index = nearestIndexAt(
			anchor,
			pickableIndexes,
			{
				x: transition.x,
				y: transition.y,
				alpha: transition.alpha,
				projection: view.screenProjection(viewport)
			},
			HOVER_PICK_RADIUS
		);
		return index === -1 ? null : songs.keys[index];
	};

	// The song under the anchor; markers first, since they sit on top, and
	// picked at their bigger size. Every outlined song can be hovered,
	// playable or not (hoverableSongKeys only limits plain dots).
	const findSongAt = (anchor: Point2D): string | null =>
		(outlinedSongKeys
			? nearestSongAt(
					anchor,
					outlinedSongKeys,
					songScreen,
					OUTLINED_POINT_RADIUS + HOVER_PICK_RADIUS - POINT_RADIUS
				)
			: null) ?? nearestPickableSongAt(anchor);

	const handlePointerMove = (event: MouseEvent) => {
		if (!containerEl) return;
		clickGuard.onPointerMove(event);
		if (!hoverable) return;
		const anchor = anchorFromMouseEvent(event, containerEl);
		if (hexFrame) {
			const key = hexKeyAt(anchor, transform, hexFrame);
			const region =
				key === null ? null : (hexFrame.regionByKey.get(key) ?? null);
			hoveredHex =
				key === null || region === null ? null : { key, anchor, region };
			setPointerHover(null);
			delayedTooltip.clearHover();
			hoveredClusterHit = null;
			return;
		}
		hoveredHex = null;
		const songKey = findSongAt(anchor);
		setPointerHover(songKey);
		delayedTooltip.setHover(songKey, songKey === null ? null : anchor);
		hoveredClusterHit =
			songKey === null ? clusterAt(anchor, clusterHits) : null;
	};

	// The song under the pointer, reported out only when it changes (a
	// linkedSongKey hover isn't reported back).
	let pointerSongKey: string | null = null;
	const setPointerHover = (songKey: string | null) => {
		hoveredSongKey = songKey;
		if (songKey === pointerSongKey) return;
		pointerSongKey = songKey;
		onSongHover?.(songKey);
	};

	const handlePointerLeave = () => {
		hoveredHex = null;
		setPointerHover(null);
		delayedTooltip.clearHover();
		hoveredClusterHit = null;
	};

	// A linked song highlights as if the pointer were on it, until it
	// changes, but without a tooltip: whatever's linked to it shows its own.
	$effect(() => {
		const songKey = linkedSongKey;
		if (songKey === null) return;
		untrack(() => {
			hoveredSongKey = songKey;
		});
		return () => {
			if (hoveredSongKey !== songKey) return;
			hoveredSongKey = null;
		};
	});

	const handleClick = (event: MouseEvent) => {
		if (!clickable || clickGuard.shouldSuppressClick() || !containerEl) return;
		const anchor = anchorFromMouseEvent(event, containerEl);
		// Songs (and their labels) are only drawn at dot zoom, so they can
		// only be clicked then.
		const clickedHexKey = hexFrame
			? hexKeyAt(anchor, transform, hexFrame)
			: null;
		const outlinedSongKey = hexFrame ? null : findOutlinedSongAt(anchor);
		const songKey = hexFrame ? null : findSongAt(anchor);
		// Opens in a new tab, and the click still does what it normally does
		// (opening the song's chords), so they're there when you come back.
		const songLink = songKey === null ? undefined : songLinks[songKey];
		if (songLink) window.open(songLink, "_blank", "noopener");
		const region = hexFrame
			? clickedHexKey === null
				? null
				: hexFrame.regionByKey.get(clickedHexKey)
			: songKey === null
				? null
				: clusterRegionBySongKey?.get(songKey);
		const actions = resolveClick({
			atHexZoom: hexFrame !== null,
			hexMode,
			outlinedSongKey,
			songKey,
			regionName: region?.name ?? null,
			onHex: clickedHexKey !== null,
			playingSongKey,
			openSongId,
			selectedSongKey,
			canToggleChords: onSongChordsToggle !== null,
			movable,
			hoverable
		});
		for (const action of actions) runClickAction(action, anchor);
	};

	const runClickAction = (action: ClickAction, anchor: Point2D) => {
		switch (action.kind) {
			case "toggleChords":
				onSongChordsToggle?.(action.songKey);
				break;
			case "outlinedSongClick":
				onOutlinedSongClick?.(action.songKey);
				break;
			case "clusterClick":
				onClusterClick?.(action.name, action.songKey);
				break;
			case "zoomToHex":
				camera.scaleAround(anchor, HEX_FOCUS_SCALE, HEX_CLICK_ZOOM_MS);
				break;
			case "select":
				onSelect(action.songKey);
				break;
		}
	};

	$effect(() => {
		if (!clustersAvailable) {
			hoveredClusterHit = null;
		}
	});

	const transition = createTransition({
		get target() {
			return transitionTarget;
		},
		timing: transitionTiming,
		onFrame: () => draw()
	});

	// How much hexes cover the dots: 1 while songs rest in a hex layout,
	// fading out before they move and back in once they settle.
	const hexFade = createFade({
		get target() {
			return hexMode && transition.settled ? 1 : 0;
		},
		riseMs: HEX_FADE_IN_MS,
		fallMs: HEX_FADE_OUT_MS,
		onFrame: () => draw()
	});

	const spotlight = createSpotlightTween({
		get songKey() {
			return spotlightSongKey;
		},
		onFrame: () => draw()
	});

	const camera = createCamera({
		get canvas() {
			return canvasEl;
		},
		get movable() {
			return movable;
		},
		get width() {
			return width;
		},
		get height() {
			return height;
		},
		get viewSize() {
			return viewSize;
		},
		get transform() {
			return transform;
		},
		get homeTransform() {
			return homeTransform;
		},
		get hexMode() {
			return hexMode;
		},
		get focusFrame() {
			return focusFrame;
		},
		get focusScale() {
			return focusScale;
		},
		get focusSongKey() {
			return focusSongKey;
		},
		get focusClusterName() {
			return focusClusterName;
		},
		get instantFocus() {
			return instantFocus;
		},
		get selectedClusterName() {
			return selectedClusterName;
		},
		get zoomSongKey() {
			return zoomSongKey;
		},
		get selectedSongKey() {
			return selectedSongKey;
		},
		get clusters() {
			return clusters;
		},
		get clusterNames() {
			return resolvedClusterNames;
		},
		basePixelOf: (songKey) => {
			const index = songs.indexOf.get(songKey);
			return isDrawnIndex(index) ? restingBasePixel(index) : null;
		},
		anyBasePixelOf: (songKey) => restingBasePixel(songs.indexOf.get(songKey)),
		onZoom: (next, byUser) => {
			transform = next;
			onTransformChange?.(next);
			if (byUser) onUserMove?.();
			// Hexes re-bin as the zoom changes, so a hovered hex is stale.
			hoveredHex = null;
		},
		onGestureStart: () => delayedTooltip.startDrag(),
		onGestureEnd: () => delayedTooltip.endDrag()
	});

	// Repaints whenever anything draw() reads changes.
	$effect(draw);

	const rotating = createRotatingLabels({
		get enabled() {
			return showRotatingLabels;
		},
		get spots() {
			return labelSpots;
		}
	});

	const tooltip = createTooltipSong({
		get songKey() {
			return delayedTooltip.tooltipSongKey;
		},
		get songByKey() {
			return songByKey;
		},
		get loadSong() {
			return loadSong;
		},
		get summaries() {
			return songSummaryByKey;
		}
	});

	const tooltipStyle = $derived(
		hoverCardStyle(delayedTooltip.tooltipAnchor, width)
	);

	// What clicking the hovered song does, for the simple tooltip.
	const songTooltipHint = $derived.by(() => {
		const songKey = delayedTooltip.tooltipSongKey;
		if (!onSongChordsToggle || isOutlined(songKey ?? "")) return "";
		return songKey === openSongId
			? "👆 Click to hide the full chords"
			: "👆 Click to show the full chords";
	});

	const tooltipVisible = $derived(
		delayedTooltip.tooltipSongKey !== null &&
			isDrawn(delayedTooltip.tooltipSongKey)
	);
</script>

<div
	class="scatter"
	bind:this={containerEl}
	bind:clientWidth={width}
	bind:clientHeight={height}
	{...interactive ? { role: "button", tabindex: 0 } : { role: "img" }}
	aria-label="Song embedding scatter plot"
	onmousemove={interactive ? handlePointerMove : undefined}
	onpointerdown={interactive
		? (event) => clickGuard.onPointerDown(event)
		: undefined}
	onpointerup={interactive ? () => clickGuard.onPointerUp() : undefined}
	onpointercancel={interactive ? () => clickGuard.onPointerUp() : undefined}
	onmouseleave={interactive ? handlePointerLeave : undefined}
	onclick={interactive ? handleClick : undefined}
	onkeydown={interactive
		? (event) => {
				if (event.key === "Enter" || event.key === " ") {
					if (clickable && hoveredSongKey !== null) {
						onSelect(
							hoveredSongKey === selectedSongKey ? null : hoveredSongKey
						);
					}
				}
				if (event.key === "Escape") onSelect(null);
			}
		: undefined}
>
	<!-- DEV-ONLY-REMOVE-BEFORE-PUBLISH (perf meter) -->
	{#if perfMeter}
		<pre class="perf-overlay" bind:this={perfEl}></pre>
	{/if}
	<canvas
		bind:this={canvasEl}
		class:inert={!interactive}
		class:grabbable={movable}
		class:clickable={clickable &&
			(hoveredHex !== null ||
				(hoveredSongKey !== null && isPlayableOutlined(hoveredSongKey)))}
		style:width="{width}px"
		style:height="{height}px"
	></canvas>

	{#if hoveredHex}
		{@const { region } = hoveredHex}
		<HexRegionTooltip
			{region}
			style={hoverCardStyle(hoveredHex.anchor, width)}
			color={regionColorByName.get(region.name) ?? hexColors.unmatched}
			songCount={clusterSizeByHash.get(region.id) ?? 0}
			{yearDomain}
			{maxClusterSongCount}
			songs={hoveredClusterSongs}
			titlePrefix={outlinedTitlePrefix && hexHasPlayableSongs?.(region.name)
				? outlinedTitlePrefix
				: null}
		/>
	{/if}

	<ClusterTitles
		titles={placedTitles.titles}
		onSelect={onClusterClick
			? (name) => {
					delayedTooltip.clearHover();
					onClusterClick?.(name, null);
				}
			: null}
	/>

	<!-- faded with the hexes in draw() -->
	<div class="rotating-labels" bind:this={rotatingLabelsEl}>
		<RotatingLabels
			labels={rotating.labels}
			screenOf={toScreen}
			textColor={hexColors.labelText}
			haloColor={hexColors.labelHalo}
		/>
	</div>

	{#if tooltipVisible && delayedTooltip.tooltipAnchor}
		<ScatterSongTooltip
			style={tooltipStyle}
			song={tooltip.song}
			summary={tooltip.summary}
			simple={simpleSongTooltip}
			hint={songTooltipHint}
			colorForProgression={(name) => regionColorByProgressionName.get(name)}
		/>
	{/if}
</div>

<style>
	.scatter {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	/* DEV-ONLY-REMOVE-BEFORE-PUBLISH (perf meter) */
	.perf-overlay {
		position: fixed;
		top: 4px;
		left: 4px;
		z-index: 1000;
		margin: 0;
		padding: 4px 6px;
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.75);
		color: #7cfc9a;
		font:
			11px/1.3 ui-monospace,
			monospace;
		pointer-events: none;
	}

	.rotating-labels {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	canvas {
		display: block;
		cursor: default;
	}

	canvas.grabbable {
		cursor: grab;
	}

	canvas.clickable {
		cursor: pointer;
	}

	canvas.grabbable:active {
		cursor: grabbing;
	}

	canvas.inert {
		cursor: default;
		pointer-events: none;
	}
</style>
