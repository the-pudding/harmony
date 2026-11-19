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
		TWEEN_DURATION_MS
	} from "./scatter/constants.js";
	import type { EmbeddingScatterProps as Props } from "./scatter/props.js";
	import type {
		ClusterHit,
		LabelSpot,
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
		type TransitionTarget
	} from "./scatter/transition.svelte.js";
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
	import { drawAxisLabels } from "./scatter/paint/axes.js";
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
	import { drawHexes, type HexPaintMode } from "./scatter/paint/hexes.js";
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
		renderMode = "dots",
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

	// Where the layout puts each song it places, by song key, for the
	// region colors (worked out once per layout, not per frame).
	const restingPoints = $derived(
		songs.keys.flatMap((songKey, index) =>
			Number.isNaN(layout.x[index]) || Number.isNaN(layout.y[index])
				? []
				: [{ songKey, nx: layout.x[index], ny: layout.y[index] }]
		)
	);

	// 1 for every song that should be drawn, 0 for the ones visibleSongKeys
	// leaves out; the transition fades between them.
	const targetAlpha = $derived.by(() => {
		const alpha = new Float32Array(songs.count);
		for (let index = 0; index < songs.count; index++) {
			alpha[index] =
				visibleSongKeys === null || visibleSongKeys.has(songs.keys[index])
					? 1
					: 0;
		}
		return alpha;
	});

	// A song the layout places and visibleSongKeys keeps, by index.
	const isDrawnIndex = (index: number | undefined): index is number =>
		index !== undefined &&
		targetAlpha[index] > 0 &&
		!Number.isNaN(layout.x[index]);

	const isDrawn = (songKey: string): boolean =>
		isDrawnIndex(songs.indexOf.get(songKey));

	// Where a song rests in this layout, in base pixels, or null.
	const restingBasePixel = (index: number | undefined): Point2D | null =>
		index === undefined || Number.isNaN(layout.x[index])
			? null
			: toBasePixel({ nx: layout.x[index], ny: layout.y[index] });

	const isAccented = (songKey: string): boolean =>
		accentFillColor !== null && (accentSongKeys?.has(songKey) ?? false);

	const hexMode = $derived(
		renderMode !== "dots" && progressionSharesBySongKey !== null
	);
	const hexPaintMode = $derived<HexPaintMode>(
		renderMode === "dots" ? "hex" : renderMode
	);

	const regionColorByName = $derived(
		!hexMode || clusterRegionBySongKey === null
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
		!hexMode ||
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

	const viewSize = $derived({ width, height, offsetY });
	const viewport = $derived({ ...viewSize, transform });
	const plot = $derived(view.plotSize(viewSize));

	const toBasePixel = (position: Position) =>
		view.toBasePixel(viewSize, position);
	const toScreen = (position: Position) => view.toScreen(viewport, position);
	const homeTransform = $derived(view.homeTransform(offsetY));

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
	let drawnDots = 0;

	const draw = () => {
		const perfStart = perfMeter ? performance.now() : 0; // perf meter
		const context =
			canvasEl &&
			prepareCanvas(
				canvasEl,
				width,
				height,
				pixelRatioOverride ??
					Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1)
			);
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
		const zoomLevel = hexMode ? hexZoomLevel(transform.k, HEX_ZOOM) : null;
		if (zoomLevel?.kind === "hex") {
			drawnDots = 0; // perf meter
			drawHexFrame(scene, zoomLevel.radius);
		} else {
			drawnDots = drawDotFrame(scene); // perf meter
		}
		context.globalAlpha = 1;
		// perf meter
		if (perfMeter && perfEl) {
			const text = perfMeter.record(performance.now() - perfStart, drawnDots);
			if (text !== null) perfEl.textContent = text;
		}
	};

	// Zoomed out in hex mode: the binned map and its region labels.
	const drawHexFrame = (scene: Scene, radius: number) => {
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
			mode: hexPaintMode,
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
	};

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

	// Dots mode, or hex mode zoomed in to dots: cluster outlines, dots,
	// marked songs and their labels, then rings around the selected and
	// hovered songs. Returns how many plain dots it drew.
	const drawDotFrame = (scene: Scene): number => {
		hexFrame = null;
		setLabelSpots([]);
		const gradient = hexMode
			? gradientStrengthForZoom(transform.k, HEX_ZOOM, HEX_MIN_SHARE_FADE)
			: 0;
		const songRegionFill = hexMode ? songRegionFillAt(gradient) : null;
		const style = createPointStyle({
			spotlight: spotlight.current,
			outlinedSongKeys,
			hoveredSongKey,
			selectedSongKey,
			coClusterSongKeys,
			emphasizedSongKeys,
			inYearSongKeys
		});

		clusterHits = showClusterOutlines
			? drawClusterOutlines(scene, {
					clusters,
					memberIndexes: clusterMemberIndexes,
					names: resolvedClusterNames,
					emphasizedClusterHashes,
					familyEmphasisSongKeys,
					// Hex maps title clusters in HTML instead (see titleSpots).
					showNames: showClusterNames && !hexMode,
					// Hex maps already show the count in the hex tooltip.
					countClusterHash:
						renderMode === "hex"
							? null
							: (hoveredClusterHit?.cluster.hash ?? null)
				})
			: [];
		setTitleSpots(
			hexMode && showClusterNames
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
				regionFill: songRegionFill,
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
	const songScreen = (songKey: string): Point2D | null => {
		const index = songs.indexOf.get(songKey);
		if (index === undefined || !(transition.alpha[index] > 0)) return null;
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

	const transitionTarget = $derived<TransitionTarget>({
		x: layout.x,
		y: layout.y,
		alpha: targetAlpha,
		stagger: layout.stagger ?? null
	});

	const transition = createTransition({
		get target() {
			return transitionTarget;
		},
		durationMs: TWEEN_DURATION_MS,
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

	<RotatingLabels
		labels={rotating.labels}
		screenOf={toScreen}
		textColor={hexColors.labelText}
		haloColor={hexColors.labelHalo}
	/>

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
