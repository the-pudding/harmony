<script lang="ts">
	import { onDestroy, untrack } from "svelte";
	import { fade } from "svelte/transition";
	import {
		easeCubicInOut,
		select,
		zoom,
		zoomIdentity,
		type ZoomTransform
	} from "d3";
	import type { GroupedSong } from "../../../data/songBrowser.js";
	import coreProgressions from "../../../data/core-progressions.js";
	import { fillStyleForGroupShares } from "./groupColorBlend.js";
	import SongTooltip from "../../../routes/demo/shared/SongTooltip.svelte";
	import HexSongTooltip from "./HexSongTooltip.svelte";
	import SongLabel from "./SongLabel.svelte";
	import WatercolorProgressionChords from "$routes/demo/design/chord-viz/WatercolorProgressionChords.svelte";
	import { progressionTokensOf } from "$routes/demo/design/chord-viz/topProgressions.js";
	import { paletteById } from "$routes/demo/design/chord-viz/chordPalettes.js";
	import { DEFAULT_WATERCOLOR_SETTINGS } from "$routes/demo/design/chord-viz/watercolor.js";
	import { romanRe } from "$utils/chordify";
	import { createDelayedHoverTooltip } from "../../../routes/demo/shared/delayedHoverTooltip.svelte.js";
	import { createClickAfterDragGuard } from "../../../routes/demo/shared/clickAfterDragGuard.js";
	import {
		anchorFromMouseEvent,
		hoverCardStyle,
		type HoverCardAnchor
	} from "../../../routes/demo/shared/hoverCardPosition.js";
	import type { ScatterPoint } from "./scatterPoint.js";
	import {
		gradientStrengthForZoom,
		hexZoomLevel,
		type ClusterRegion
	} from "../embedding/layout/hexBins.js";
	import {
		MIN_ZOOM,
		MAX_ZOOM,
		HEX_ZOOM,
		DEFAULT_FOCUS_SCALE,
		FOCUS_TRANSITION_MS,
		SCRIPTED_FOCUS_TRANSITION_MS,
		HEX_FOCUS_SCALE,
		ZOOM_SONG_HEX_FACTOR,
		FLY_TO_ZOOM_OUT_FACTOR,
		FLY_TO_TRANSITION_MS,
		HEX_CLICK_ZOOM_MS,
		TWEEN_DURATION_MS,
		POINT_RADIUS,
		HOVER_PICK_RADIUS,
		STAR_FILL_COLOR,
		OUTLINE_COLOR,
		OUTLINED_POINT_RADIUS,
		PLAYING_TWEEN_MS,
		CLUSTERABLE_METHODS,
		HEX_THEME_COLORS,
		HEX_LABEL_FONT,
		ROTATING_LABEL_COUNT,
		ROTATING_LABEL_HOLD_MS,
		ROTATING_LABEL_HOLD_JITTER_MS,
		ROTATING_LABEL_GAP_MS,
		ROTATING_LABEL_START_STAGGER_MS,
		ROTATING_LABEL_FADE_MS
	} from "./scatter/constants.js";
	import type { EmbeddingScatterProps as Props } from "./scatter/props.js";
	import type {
		ClusterHit,
		LabelSpot,
		NormalizedPoint,
		Point2D,
		Position
	} from "./scatter/types.js";
	import { normalizePoints } from "./scatter/normalizePoints.js";
	import {
		clusterAt,
		hexKeyAt,
		labelSongKeyAt,
		nearestSongAt
	} from "./scatter/hitTesting.js";
	import { resolveClick, type ClickAction } from "./scatter/clickIntent.js";
	import { createPointStyle, lerp } from "./scatter/pointStyle.js";
	import { prepareCanvas, type Scene } from "./scatter/paint/scene.js";
	import { drawAxisLabels } from "./scatter/paint/axes.js";
	import { drawClusterOutlines } from "./scatter/paint/clusters.js";
	import {
		createDotFill,
		drawDots,
		drawSelectionRings
	} from "./scatter/paint/dots.js";
	import { drawMarkedSongs } from "./scatter/paint/markedSongs.js";
	import {
		drawOutlinedSongLabels,
		type OutlinedLabelHitArea
	} from "./scatter/paint/outlinedLabels.js";
	import {
		createHexLayoutCache,
		type HexLayout
	} from "./scatter/paint/hexLayout.js";
	import { drawHexes, type HexPaintMode } from "./scatter/paint/hexes.js";
	import { drawHexRegionLabels } from "./scatter/paint/hexLabels.js";
	import * as view from "./scatter/viewport.js";
	import {
		colorsByProgressionName,
		createRegionFills,
		regionColorsByName
	} from "./scatter/regionColors.js";

	const {
		points,
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
		selectedClusterName = null,
		zoomSongKey = null,
		openSongId = null,
		focusFrame = null,
		offsetY = 0,
		emphasizedSongKeys = null,
		colorMode = "groups",
		showClusterOutlines = true,
		showClusterNames = true,
		familyEmphasisSongKeys = null,
		emphasisFillColor = null,
		accentSongKeys = null,
		accentFillColor = null,
		outlinedSongKeys = null,
		outlinedTitlePrefix = null,
		playingSongKey = null,
		playingClipProgressFraction = 0,
		playingChordColorSegments = [],
		renderMode = "dots",
		progressionSharesBySongKey = null,
		clusterRegionBySongKey = null,
		clusterNames = null,
		movable = true,
		hoverable = true,
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
		onProgressionColors = null
	}: Props = $props();

	const normalizeName = (name: string): string => name.trim().toLowerCase();

	const labelNameSet = $derived(
		labelNames === null ? null : new Set(labelNames.map(normalizeName))
	);

	const interactive = $derived(movable || hoverable);

	const chordsByProgressionName = new Map(
		coreProgressions.map((progression) => [
			progression.name,
			[progression.chordProgression].flat()[0]
		])
	);

	const TOOLTIP_CHORD_PALETTE = paletteById("journey-from-home");

	const hexColors = $derived(HEX_THEME_COLORS[theme]);

	const baseFillFor = (
		context: CanvasRenderingContext2D,
		screen: { x: number; y: number },
		point: ScatterPoint
	): string | CanvasGradient => {
		if (colorMode === "groups") {
			return fillStyleForGroupShares(
				context,
				screen.x,
				screen.y,
				point.groupShares
			);
		}
		if (colorMode === "homogeneity") return point.homogeneityColor;
		return STAR_FILL_COLOR;
	};

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

	// Labels that fit on the current hex frame without overlapping, placed
	// like song positions (0–1 across the plot). Rotating labels are picked
	// from these.
	let labelSpots = $state<LabelSpot[]>([]);
	let rotatingLabels = $state<(LabelSpot & { id: number })[]>([]);

	const resolvedClusterNames = $derived(
		clusterNames ?? new Map<string, string>()
	);

	// Each cluster outline from the last dot frame, so hover and click
	// hit-testing don't refit them on every mousemove.
	let clusterHits: ClusterHit[] = [];

	let displayedPositions = new Map<string, Position>();
	let tweenFrame = 0;

	const normalizedPoints = $derived(normalizePoints(points));

	// Bounds stay based on every point so filtering never rescales the map.
	const drawablePoints = $derived(
		visibleSongKeys === null
			? normalizedPoints
			: normalizedPoints.filter((point) => visibleSongKeys.has(point.songKey))
	);

	const drawableSongKeys = $derived(
		drawablePoints.map((point) => point.songKey)
	);

	const pointBySongKey = $derived(
		new Map(drawablePoints.map((point) => [point.songKey, point]))
	);

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
			: regionColorsByName(normalizedPoints, clusterRegionBySongKey)
	);

	const regionColorByProgressionName = $derived(
		colorsByProgressionName(clusterRegionBySongKey, regionColorByName)
	);

	$effect(() => {
		onProgressionColors?.(regionColorByProgressionName);
	});

	const regionFills = $derived(
		createRegionFills({
			colorByRegionName: regionColorByName,
			themeColors: hexColors,
			regionBySongKey: clusterRegionBySongKey,
			sharesBySongKey: progressionSharesBySongKey
		})
	);

	const isOutlined = (songKey: string): boolean =>
		outlinedSongKeys?.has(songKey) ?? false;

	const pointsInDrawOrder = $derived(
		accentSongKeys === null || accentFillColor === null
			? drawablePoints
			: [
					...drawablePoints.filter((point) => !isAccented(point.songKey)),
					...drawablePoints.filter((point) => isAccented(point.songKey))
				]
	);

	const clustersAvailable = $derived(CLUSTERABLE_METHODS.has(method));

	const viewSize = $derived({ width, height, offsetY });
	const viewport = $derived({ ...viewSize, transform });
	const plot = $derived(view.plotSize(viewSize));

	const toBasePixel = (position: Position) =>
		view.toBasePixel(viewSize, position);
	const toScreen = (position: Position) => view.toScreen(viewport, position);
	const isOnScreen = (screen: Point2D) => view.isOnScreen(viewSize, screen);
	const transformCenteredOn = (base: Point2D, scale: number) =>
		view.transformCenteredOn(viewSize, base, scale);
	const constrainTransform = (t: ZoomTransform) =>
		view.constrainTransform(viewSize, t);
	const homeTransform = $derived(view.homeTransform(offsetY));

	// Each song's eased spotlight emphasis, from 0 to 1 (spotlit), and how
	// far the rest are faded, from 0 (nothing spotlit) to 1. Tweened toward
	// spotlightSongKey by the effect below, which redraws each frame itself,
	// so these aren't reactive.
	let playingEmphasis = new Map<string, number>();
	let playingFade = 0;

	const spotlightSongKey = $derived(
		playingSongKey ?? openSongId ?? zoomSongKey
	);

	// Where each outlined song's label was last drawn. Not reactive, since
	// drawing fills it.
	let outlinedLabelHitAreas = new Map<string, OutlinedLabelHitArea>();
	let hoveredLabelSongKey = $state<string | null>(null);

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
	// re-runs it whenever anything it reads changes; the position and
	// spotlight tweens also run it on each of their frames.
	const draw = () => {
		const context =
			canvasEl &&
			prepareCanvas(
				canvasEl,
				width,
				height,
				pixelRatioOverride ?? (window.devicePixelRatio || 1)
			);
		if (!context) return;
		const scene: Scene = {
			context,
			viewport,
			positions: displayedPositions,
			themeColors: hexColors
		};
		drawAxisLabels(scene, axisLabels);
		const zoomLevel = hexMode ? hexZoomLevel(transform.k, HEX_ZOOM) : null;
		if (zoomLevel?.kind === "hex") drawHexFrame(scene, zoomLevel.radius);
		else drawDotFrame(scene);
		context.globalAlpha = 1;
	};

	// Zoomed out in hex mode: the binned map and its region labels.
	const drawHexFrame = (scene: Scene, radius: number) => {
		const layout = hexLayoutFor({
			radius,
			size: viewSize,
			positions: displayedPositions,
			songKeys: drawablePoints,
			regionBySongKey: clusterRegionBySongKey,
			sharesBySongKey: progressionSharesBySongKey
		});
		hexFrame = layout;
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

	// Dots mode, or hex mode zoomed in to dots: cluster outlines, dots,
	// marked songs and their labels, then rings around the selected and
	// hovered songs.
	const drawDotFrame = (scene: Scene) => {
		hexFrame = null;
		setLabelSpots([]);
		const gradient = hexMode
			? gradientStrengthForZoom(transform.k, HEX_ZOOM)
			: 0;
		const songRegionFill = hexMode
			? (songKey: string) => regionFills.songRegionFill(songKey, gradient)
			: null;
		const style = createPointStyle({
			spotlight: { emphasis: playingEmphasis, fade: playingFade },
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
					names: resolvedClusterNames,
					emphasizedClusterHashes,
					familyEmphasisSongKeys,
					showNames: showClusterNames,
					// Hex maps already show the count in the hex tooltip.
					countClusterHash:
						renderMode === "hex"
							? null
							: (hoveredClusterHit?.cluster.hash ?? null)
				})
			: [];

		drawDots(scene, {
			points: pointsInDrawOrder,
			style,
			fill: createDotFill({
				colorMode,
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
			hoveredSongKey,
			playingSongKey,
			playback: {
				progressFraction: playingClipProgressFraction,
				chordSegments: playingChordColorSegments
			}
		});

		outlinedLabelHitAreas =
			outlinedSongKeys && songSummaryByKey
				? drawOutlinedSongLabels(scene, {
						style,
						summaries: songSummaryByKey,
						titlePrefix: outlinedTitlePrefix,
						openSongId,
						hoveredLabelSongKey
					})
				: new Map();

		drawSelectionRings(
			scene,
			[selectedSongKey, hoveredSongKey].filter(
				(songKey): songKey is string =>
					songKey !== null && pointBySongKey.has(songKey)
			),
			style
		);
	};

	const tweenTo = (targets: NormalizedPoint[]) => {
		cancelAnimationFrame(tweenFrame);

		// Nothing to animate from on the first layout.
		if (displayedPositions.size === 0) {
			displayedPositions = new Map(
				targets.map((target) => [
					target.songKey,
					{ nx: target.nx, ny: target.ny }
				])
			);
			draw();
			return;
		}

		const from = new Map(
			targets.map((target): [string, Position] => [
				target.songKey,
				displayedPositions.get(target.songKey) ?? {
					nx: target.nx,
					ny: target.ny
				}
			])
		);
		const startedAt = performance.now();

		const step = () => {
			const progress = Math.min(
				1,
				(performance.now() - startedAt) / TWEEN_DURATION_MS
			);
			const eased = easeCubicInOut(progress);
			displayedPositions = new Map(
				targets.map((target): [string, Position] => {
					const origin = from.get(target.songKey)!;
					return [
						target.songKey,
						{
							nx: origin.nx + (target.nx - origin.nx) * eased,
							ny: origin.ny + (target.ny - origin.ny) * eased
						}
					];
				})
			);
			draw();
			if (progress < 1) tweenFrame = requestAnimationFrame(step);
		};

		step();
	};

	// Hit-testing against the last frame drawn.
	const songScreen = (songKey: string): Point2D | null => {
		const position = displayedPositions.get(songKey);
		return position ? toScreen(position) : null;
	};

	// The outlinedSongKeys song whose marker is under the anchor, give or
	// take the same slack plain dots get.
	const findOutlinedSongAt = (anchor: Point2D): string | null =>
		outlinedSongKeys
			? nearestSongAt(
					anchor,
					outlinedSongKeys,
					songScreen,
					OUTLINED_POINT_RADIUS + HOVER_PICK_RADIUS - POINT_RADIUS
				)
			: null;

	// The song under the anchor; markers first, since they sit on top.
	const findSongAt = (anchor: Point2D): string | null =>
		findOutlinedSongAt(anchor) ??
		nearestSongAt(anchor, drawableSongKeys, songScreen, HOVER_PICK_RADIUS);

	const findLabelAt = (anchor: Point2D): string | null =>
		labelSongKeyAt(anchor, outlinedLabelHitAreas, {
			playingSongKey,
			hoveredLabelSongKey
		});

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
			hoveredSongKey = null;
			delayedTooltip.clearHover();
			hoveredClusterHit = null;
			hoveredLabelSongKey = null;
			return;
		}
		hoveredHex = null;
		hoveredLabelSongKey = onSongChordsToggle ? findLabelAt(anchor) : null;
		const songKey = findSongAt(anchor);
		hoveredSongKey = songKey;
		delayedTooltip.setHover(songKey, songKey === null ? null : anchor);
		hoveredClusterHit =
			songKey === null ? clusterAt(anchor, clusterHits) : null;
	};

	const handlePointerLeave = () => {
		hoveredHex = null;
		hoveredSongKey = null;
		delayedTooltip.clearHover();
		hoveredClusterHit = null;
		hoveredLabelSongKey = null;
	};

	const handleClick = (event: MouseEvent) => {
		if (clickGuard.shouldSuppressClick() || !containerEl) return;
		const anchor = anchorFromMouseEvent(event, containerEl);
		// Songs (and their labels) are only drawn at dot zoom, so they can
		// only be clicked then.
		const clickedHexKey = hexFrame
			? hexKeyAt(anchor, transform, hexFrame)
			: null;
		const outlinedSongKey = hexFrame ? null : findOutlinedSongAt(anchor);
		const songKey = hexFrame ? null : findSongAt(anchor);
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
			labelSongKey:
				onSongChordsToggle && !hexFrame ? findLabelAt(anchor) : null,
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
				if (canvasEl && zoomBehavior) {
					select(canvasEl)
						.transition()
						.duration(HEX_CLICK_ZOOM_MS)
						.call(zoomBehavior.scaleTo, HEX_FOCUS_SCALE, [anchor.x, anchor.y]);
				}
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

	$effect(() => {
		const targets = normalizedPoints;
		untrack(() => tweenTo(targets));
		return () => cancelAnimationFrame(tweenFrame);
	});

	// Eases playingEmphasis and playingFade toward spotlightSongKey, from
	// wherever they are (mid-tween included), redrawing each frame.
	$effect(() => {
		const target = spotlightSongKey;
		const fromEmphasis = new Map(playingEmphasis);
		const fromFade = playingFade;
		const songKeys = new Set([...fromEmphasis.keys()]);
		if (target) songKeys.add(target);
		const startedAt = performance.now();

		let frame = 0;
		const step = () => {
			const progress = Math.min(
				1,
				(performance.now() - startedAt) / PLAYING_TWEEN_MS
			);
			const eased = easeCubicInOut(progress);
			playingEmphasis = new Map(
				[...songKeys]
					.map((songKey): [string, number] => [
						songKey,
						lerp(
							fromEmphasis.get(songKey) ?? 0,
							songKey === target ? 1 : 0,
							eased
						)
					])
					.filter(([, emphasis]) => emphasis > 0)
			);
			playingFade = lerp(fromFade, target ? 1 : 0, eased);
			draw();
			if (progress < 1) frame = requestAnimationFrame(step);
		};
		// Started on the next frame so draw()'s reads aren't tracked here.
		frame = requestAnimationFrame(step);
		return () => cancelAnimationFrame(frame);
	});

	// Hoisted out of the effect below (rather than a local const inside it) so
	// the scripted-zoom effect further down can drive the same behavior
	// programmatically via zoomBehavior.transform.
	let zoomBehavior: ReturnType<typeof zoom<HTMLCanvasElement, unknown>> | null =
		null;

	$effect(() => {
		const canvas = canvasEl;
		if (!canvas) return;
		const canMove = movable;
		zoomBehavior = zoom<HTMLCanvasElement, unknown>()
			.scaleExtent([MIN_ZOOM, MAX_ZOOM])
			.constrain(constrainTransform)
			// d3's default filter (no ctrl-drag, primary button only), and
			// nothing at all unless movable. Scripted zooms bypass the filter.
			.filter((event) => {
				if (!canMove) return false;
				if (event.ctrlKey && event.type !== "wheel") return false;
				return !event.button;
			})
			.on("start", () => {
				delayedTooltip.startDrag();
			})
			.on("end", delayedTooltip.endDrag)
			.on("zoom", (event) => {
				transform = event.transform;
				onTransformChange?.(event.transform);
				// Scripted zooms have no sourceEvent.
				if (event.sourceEvent) onUserMove?.();
				// Hexes re-bin as the zoom changes, so a hovered hex is stale.
				hoveredHex = null;
			});
		select(canvas).call(zoomBehavior);
		return () => {
			select(canvas).on(".zoom", null);
			zoomBehavior = null;
		};
	});

	// Fits a cluster's current member bounds to the view, for
	// focusClusterName and selectedClusterName. Null if none of its songs
	// have a known position yet.
	const clusterFocusTransform = (
		clusterSongKeys: readonly string[]
	): ZoomTransform | null =>
		view.clusterFocusTransform(
			viewSize,
			clusterSongKeys.flatMap((songKey) => {
				const point = pointBySongKey.get(songKey);
				return point ? [toBasePixel(point)] : [];
			}),
			{ hexMode, focusFrame }
		);

	// clusterFocusTransform for the biggest cluster with this name
	// (case-insensitive), or null if there's none.
	const namedClusterFocusTransform = (
		clusterName: string
	): ZoomTransform | null => {
		const target = normalizeName(clusterName);
		const cluster = clusters
			.filter((candidate) => {
				const name = resolvedClusterNames.get(candidate.hash);
				return name !== undefined && normalizeName(name) === target;
			})
			.sort((a, b) => b.songKeys.length - a.songKeys.length)[0];
		return cluster ? clusterFocusTransform(cluster.songKeys) : null;
	};

	// Moves the view instantly. d3 runs the zoom handlers synchronously here,
	// and they read hover state, so it's untracked: otherwise the calling
	// effect would re-run (and zoom back) whenever a song is hovered.
	const jumpTo = (canvas: HTMLCanvasElement, target: ZoomTransform) => {
		untrack(() => {
			if (zoomBehavior) select(canvas).call(zoomBehavior.transform, target);
		});
	};

	// Scripted zoom (e.g. /story's beats): fully inert when both focusSongKey
	// and focusClusterName are undefined (their prop defaults), so ordinary
	// interactive pages never trigger this. focusClusterName takes priority
	// when both are set. For either: a string animates the view to center on
	// it (fitting the whole cluster, for focusClusterName), null animates
	// back out to the full view. Cluster names match case-insensitively, and
	// when several clusters share a name the biggest wins. A focus set from
	// the start jumps straight there; once the map has been shown, focus
	// changes animate.
	let hasFocused = false;
	$effect(() => {
		const canvas = canvasEl;
		if (!canvas || !zoomBehavior || width === 0 || height === 0) return;
		if (focusClusterName === undefined && focusSongKey === undefined) {
			hasFocused = true;
			return;
		}

		let targetTransform = ((): ZoomTransform | null => {
			if (focusClusterName !== undefined) {
				if (focusClusterName === null) return homeTransform;
				return namedClusterFocusTransform(focusClusterName);
			}
			if (focusSongKey === null) return homeTransform;
			if (focusSongKey === undefined) return null;
			const point = normalizedPoints.find((p) => p.songKey === focusSongKey);
			if (!point) return null;
			return transformCenteredOn(toBasePixel(point), focusScale);
		})();
		if (!targetTransform) return;
		targetTransform = constrainTransform(targetTransform);

		if (!hasFocused) {
			hasFocused = true;
			jumpTo(canvas, targetTransform);
			return;
		}
		select(canvas)
			.transition()
			.duration(SCRIPTED_FOCUS_TRANSITION_MS)
			.call(zoomBehavior.transform, targetTransform);
	});

	// Fits selectedClusterName, again whenever the frame or size changes
	// (e.g. a panel opening below the map shrinks the frame).
	$effect(() => {
		const clusterName = selectedClusterName;
		const canvas = canvasEl;
		void focusFrame;
		if (!clusterName || !canvas || !zoomBehavior) return;
		if (width === 0 || height === 0) return;
		untrack(() => {
			const target = namedClusterFocusTransform(clusterName);
			if (!target || !zoomBehavior) return;
			select(canvas)
				.transition()
				.duration(FOCUS_TRANSITION_MS)
				.call(zoomBehavior.transform, constrainTransform(target));
		});
	});

	// Centers zoomSongKey, in focusFrame when there is one, again whenever
	// the frame or size changes.
	$effect(() => {
		const songKey = zoomSongKey;
		const canvas = canvasEl;
		void focusFrame;
		if (!songKey || !canvas || !zoomBehavior) return;
		if (width === 0 || height === 0) return;
		untrack(() => {
			const point = pointBySongKey.get(songKey);
			if (!point || !zoomBehavior) return;
			const base = toBasePixel(point);
			const scale = hexMode
				? Math.min(HEX_FOCUS_SCALE * ZOOM_SONG_HEX_FACTOR, MAX_ZOOM)
				: focusScale;
			const target =
				focusFrame && focusFrame.height > 0
					? view.transformCenteredInFrame(width, focusFrame, base, scale)
					: transformCenteredOn(base, scale);
			select(canvas)
				.transition()
				.duration(FOCUS_TRANSITION_MS)
				.call(zoomBehavior.transform, constrainTransform(target));
		});
	});

	// Without a scripted focus, moves to the resting view when offsetY
	// changes: a jump the first time, then animated. (With one, the effect
	// above re-targets instead, since its targets depend on offsetY too.)
	let hasPlacedHome = false;
	$effect(() => {
		const target = homeTransform;
		const canvas = canvasEl;
		if (!canvas || !zoomBehavior) return;
		const isScripted = untrack(
			() => focusClusterName !== undefined || focusSongKey !== undefined
		);
		if (isScripted) return;
		if (!hasPlacedHome) {
			hasPlacedHome = true;
			jumpTo(canvas, target);
			return;
		}
		select(canvas)
			.transition()
			.duration(FOCUS_TRANSITION_MS)
			.call(zoomBehavior.transform, target);
	});

	const flyToSongIfOffScreen = (songKey: string) => {
		const canvas = canvasEl;
		const point = pointBySongKey.get(songKey);
		if (!canvas || !zoomBehavior || !point || width === 0 || height === 0) {
			return;
		}
		if (isOnScreen(toScreen(point))) return;
		const scale = Math.max(MIN_ZOOM, transform.k * FLY_TO_ZOOM_OUT_FACTOR);
		select(canvas)
			.transition()
			.duration(FLY_TO_TRANSITION_MS)
			.call(
				zoomBehavior.transform,
				constrainTransform(transformCenteredOn(toBasePixel(point), scale))
			);
	};

	$effect(() => {
		const songKey = selectedSongKey;
		const isScripted =
			focusClusterName !== undefined || focusSongKey !== undefined;
		if (songKey === null || isScripted) return;
		untrack(() => flyToSongIfOffScreen(songKey));
	});

	// Repaints whenever anything draw() reads changes.
	$effect(draw);

	// Runs ROTATING_LABEL_COUNT independent slots (see the constants above).
	// Spots are read when each timer fires, so this only restarts when the
	// prop changes.
	$effect(() => {
		if (!showRotatingLabels) {
			rotatingLabels = [];
			return;
		}
		let nextId = 0;
		const timers = new Set<ReturnType<typeof setTimeout>>();
		const after = (ms: number, run: () => void) => {
			const timer = setTimeout(() => {
				timers.delete(timer);
				run();
			}, ms);
			timers.add(timer);
		};
		const jitteredHold = () =>
			ROTATING_LABEL_HOLD_MS +
			(Math.random() * 2 - 1) * ROTATING_LABEL_HOLD_JITTER_MS;

		// Shows a random label that isn't already up, holds it, removes it
		// (its fade-out plays), then refills the slot. Retries shortly when
		// nothing is available yet, e.g. while the map is still loading.
		const runSlot = (holdMs: number) => {
			const showing = new Set(rotatingLabels.map((label) => label.text));
			const options = labelSpots.filter((spot) => !showing.has(spot.text));
			if (options.length === 0) {
				after(ROTATING_LABEL_FADE_MS, () => runSlot(holdMs));
				return;
			}
			const label = {
				...options[Math.floor(Math.random() * options.length)],
				id: nextId++
			};
			rotatingLabels = [...rotatingLabels, label];
			after(ROTATING_LABEL_FADE_MS + holdMs, () => {
				rotatingLabels = rotatingLabels.filter(({ id }) => id !== label.id);
				after(ROTATING_LABEL_FADE_MS + ROTATING_LABEL_GAP_MS, () =>
					runSlot(jitteredHold())
				);
			});
		};

		// First holds are spread evenly across one hold period so the slots
		// swap at different times from the start.
		for (let slot = 0; slot < ROTATING_LABEL_COUNT; slot++) {
			after(slot * ROTATING_LABEL_START_STAGGER_MS, () =>
				runSlot((ROTATING_LABEL_HOLD_MS * (slot + 1)) / ROTATING_LABEL_COUNT)
			);
		}

		return () => {
			for (const timer of timers) clearTimeout(timer);
		};
	});

	let loadedSong = $state.raw<GroupedSong | null>(null);

	$effect(() => {
		const songKey = delayedTooltip.tooltipSongKey;
		if (songKey === null || !loadSong || songByKey.has(songKey)) return;
		let active = true;
		void loadSong(songKey)
			.then((song) => {
				if (active) loadedSong = song;
			})
			.catch(() => {});
		return () => {
			active = false;
		};
	});

	const tooltipSong = $derived.by(() => {
		const songKey = delayedTooltip.tooltipSongKey;
		if (songKey === null) return null;
		return (
			songByKey.get(songKey) ??
			(loadedSong?.songKey === songKey ? loadedSong : null)
		);
	});

	const tooltipSummary = $derived(
		delayedTooltip.tooltipSongKey === null
			? null
			: (songSummaryByKey?.get(delayedTooltip.tooltipSongKey) ?? null)
	);

	const tooltipStyle = $derived(
		hoverCardStyle(delayedTooltip.tooltipAnchor, width)
	);

	const tooltipVisible = $derived(
		delayedTooltip.tooltipSongKey !== null &&
			pointBySongKey.has(delayedTooltip.tooltipSongKey)
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
					if (hoveredSongKey !== null) {
						onSelect(
							hoveredSongKey === selectedSongKey ? null : hoveredSongKey
						);
					}
				}
				if (event.key === "Escape") onSelect(null);
			}
		: undefined}
>
	<canvas
		bind:this={canvasEl}
		class:inert={!interactive}
		class:grabbable={movable}
		class:clickable={hoveredHex !== null ||
			hoveredLabelSongKey !== null ||
			(hoveredSongKey !== null && isOutlined(hoveredSongKey))}
		style:width="{width}px"
		style:height="{height}px"
	></canvas>

	{#if hoveredHex}
		{@const { region } = hoveredHex}
		{@const songCount = clusterSizeByHash.get(region.id) ?? 0}
		<!-- Named progressions map to their chords; unnamed ones (and names that
		     are themselves roman numerals) show their numerals directly. -->
		{@const chords = (
			region.progressionNames.length > 0
				? region.progressionNames
				: region.name.split(" · ")
		)
			.map((name) => chordsByProgressionName.get(name) ?? name)
			.filter((chord) => chord.split("-").every((r) => romanRe.test(r.trim())))}
		<div class="tooltip" style={hoverCardStyle(hoveredHex.anchor, width)}>
			<div class="hex-tooltip-title">
				<span
					class="hex-tooltip-swatch"
					style:background={regionColorByName.get(region.name) ??
						hexColors.unmatched}
				></span>
				{#if outlinedTitlePrefix && hexHasPlayableSongs?.(region.name)}
					{outlinedTitlePrefix}
				{/if}
				{region.name}
			</div>
			{#if chords.length > 0}
				<div class="hex-tooltip-chords">
					{#each chords as progression (progression)}
						<div class="hex-tooltip-progression">
							<WatercolorProgressionChords
								tokens={progressionTokensOf(progression)}
								tonality="major"
								settings={DEFAULT_WATERCOLOR_SETTINGS}
								palette={TOOLTIP_CHORD_PALETTE}
							/>
						</div>
					{/each}
				</div>
			{/if}
			<div class="hex-tooltip-meta">
				{songCount}
				{songCount === 1 ? "song" : "songs"}
			</div>
		</div>
	{/if}

	{#each rotatingLabels as label (label.id)}
		<span
			class="rotating-label"
			style:left="{toScreen(label).x}px"
			style:top="{toScreen(label).y}px"
			style:--label-text={hexColors.labelText}
			style:--label-halo={hexColors.labelHalo}
			transition:fade={{ duration: ROTATING_LABEL_FADE_MS }}
		>
			{label.text}
		</span>
	{/each}

	{#if tooltipVisible && delayedTooltip.tooltipAnchor}
		{#if simpleSongTooltip && tooltipSong}
			<div class="tooltip" style={tooltipStyle}>
				<HexSongTooltip
					song={tooltipSong}
					colorForProgression={(name) => regionColorByProgressionName.get(name)}
					hint={!onSongChordsToggle ||
					isOutlined(delayedTooltip.tooltipSongKey ?? "")
						? ""
						: delayedTooltip.tooltipSongKey === openSongId
							? "👆 Click to hide the full chords"
							: "👆 Click to show the full chords"}
				/>
			</div>
		{:else if tooltipSong}
			<div class="tooltip" style={tooltipStyle}>
				<SongTooltip song={tooltipSong} />
			</div>
		{:else if simpleSongTooltip && tooltipSummary}
			<div class="tooltip" style={tooltipStyle}>
				<SongLabel
					title={tooltipSummary.title}
					year={tooltipSummary.year}
					artists={tooltipSummary.artists}
				/>
			</div>
		{:else if tooltipSummary}
			<div class="tooltip" style={tooltipStyle}>
				<SongLabel
					title={tooltipSummary.title}
					year={tooltipSummary.year}
					artists={tooltipSummary.artists}
				/>
				<div class="hex-tooltip-meta">loading chords…</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.scatter {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.scatter:has(.tooltip) {
		overflow: visible;
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

	.tooltip {
		position: absolute;
		pointer-events: none;
		background: rgba(9, 9, 11, 0.96);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.5rem;
		padding: 0.875rem 1rem;
		z-index: 10;
		backdrop-filter: blur(8px);
		overflow-y: auto;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.75rem;
		color: #f4f4f5;
	}

	/* Matches HEX_LABEL_FONT and the canvas labels' halo. */
	.rotating-label {
		position: absolute;
		transform: translate(-50%, -50%);
		pointer-events: none;
		white-space: nowrap;
		font:
			500 10px "JetBrains Mono",
			ui-monospace,
			monospace;
		color: var(--label-text);
		text-shadow:
			-1.5px 0 var(--label-halo),
			1.5px 0 var(--label-halo),
			0 -1.5px var(--label-halo),
			0 1.5px var(--label-halo),
			-1px -1px var(--label-halo),
			1px 1px var(--label-halo),
			-1px 1px var(--label-halo),
			1px -1px var(--label-halo);
	}

	.hex-tooltip-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.hex-tooltip-chords {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.75rem;
		margin-bottom: 0.25rem;
	}

	/* The chords render at full size; shrink the whole row, trim and all. */
	.hex-tooltip-progression {
		zoom: 0.55;
	}

	.hex-tooltip-progression :global(.chord) {
		mix-blend-mode: normal;
	}

	.hex-tooltip-meta {
		color: #a1a1aa;
		font-size: 0.65rem;
	}

	.hex-tooltip-swatch {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 0.1875rem;
		flex-shrink: 0;
	}
</style>
