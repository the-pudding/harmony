<script lang="ts">
	import { onDestroy, untrack } from "svelte";
	import { fade } from "svelte/transition";
	import { select, zoom, zoomIdentity, type ZoomTransform } from "d3";
	import coreProgressions from "../../../data/core-progressions.js";
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
	import {
		gradientStrengthForZoom,
		hexZoomLevel,
		type ClusterRegion
	} from "../embedding/layout/hexBins.js";
	import {
		HEX_ZOOM,
		DEFAULT_FOCUS_SCALE,
		HEX_FOCUS_SCALE,
		HEX_CLICK_ZOOM_MS,
		POINT_RADIUS,
		HOVER_PICK_RADIUS,
		OUTLINE_COLOR,
		OUTLINED_POINT_RADIUS,
		CLUSTERABLE_METHODS,
		HEX_THEME_COLORS,
		HEX_LABEL_FONT,
		ROTATING_LABEL_FADE_MS
	} from "./scatter/constants.js";
	import type { EmbeddingScatterProps as Props } from "./scatter/props.js";
	import type {
		ClusterHit,
		LabelSpot,
		Point2D,
		Position
	} from "./scatter/types.js";
	import { normalizePoints } from "./scatter/normalizePoints.js";
	import { normalizeName } from "./scatter/clusterNames.js";
	import { createPositionTween } from "./scatter/positionTween.svelte.js";
	import { createSpotlightTween } from "./scatter/spotlightTween.svelte.js";
	import { createCamera } from "./scatter/camera.svelte.js";
	import { createRotatingLabels } from "./scatter/rotatingLabels.svelte.js";
	import { createTooltipSong } from "./scatter/tooltipSong.svelte.js";
	import {
		clusterAt,
		hexKeyAt,
		labelSongKeyAt,
		nearestSongAt
	} from "./scatter/hitTesting.js";
	import { resolveClick, type ClickAction } from "./scatter/clickIntent.js";
	import { createPointStyle } from "./scatter/pointStyle.js";
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

	const resolvedClusterNames = $derived(
		clusterNames ?? new Map<string, string>()
	);

	// Each cluster outline from the last dot frame, so hover and click
	// hit-testing don't refit them on every mousemove.
	let clusterHits: ClusterHit[] = [];

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
	const homeTransform = $derived(view.homeTransform(offsetY));

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
			positions: positionTween.positions,
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
			positions: positionTween.positions,
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

	// Hit-testing against the last frame drawn.
	const songScreen = (songKey: string): Point2D | null => {
		const position = positionTween.positions.get(songKey);
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

	const positionTween = createPositionTween({
		get targets() {
			return normalizedPoints;
		},
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
			const point = pointBySongKey.get(songKey);
			return point ? toBasePixel(point) : null;
		},
		anyBasePixelOf: (songKey) => {
			const point = normalizedPoints.find((p) => p.songKey === songKey);
			return point ? toBasePixel(point) : null;
		},
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

	{#each rotating.labels as label (label.id)}
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
		{#if simpleSongTooltip && tooltip.song}
			<div class="tooltip" style={tooltipStyle}>
				<HexSongTooltip
					song={tooltip.song}
					colorForProgression={(name) => regionColorByProgressionName.get(name)}
					hint={!onSongChordsToggle ||
					isOutlined(delayedTooltip.tooltipSongKey ?? "")
						? ""
						: delayedTooltip.tooltipSongKey === openSongId
							? "👆 Click to hide the full chords"
							: "👆 Click to show the full chords"}
				/>
			</div>
		{:else if tooltip.song}
			<div class="tooltip" style={tooltipStyle}>
				<SongTooltip song={tooltip.song} />
			</div>
		{:else if simpleSongTooltip && tooltip.summary}
			<div class="tooltip" style={tooltipStyle}>
				<SongLabel
					title={tooltip.summary.title}
					year={tooltip.summary.year}
					artists={tooltip.summary.artists}
				/>
			</div>
		{:else if tooltip.summary}
			<div class="tooltip" style={tooltipStyle}>
				<SongLabel
					title={tooltip.summary.title}
					year={tooltip.summary.year}
					artists={tooltip.summary.artists}
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
