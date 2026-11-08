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
	import { type DensityCluster } from "../embedding/clustering/densityClusters.js";
	import {
		clusterEllipseBoundingRadius,
		fitClusterEllipse2D,
		pointInsideClusterEllipse2D,
		type ClusterEllipse2D
	} from "../embedding/clustering/clusterBounds.js";
	import { fillStyleForGroupShares } from "./groupColorBlend.js";
	import { clusterAnnotationAlpha } from "./clusterAnnotationStyle.js";
	import SongTooltip from "../../../routes/demo/shared/SongTooltip.svelte";
	import HexSongTooltip from "./HexSongTooltip.svelte";
	import SongLabel from "./SongLabel.svelte";
	import {
		SONG_LABEL_STYLE,
		canvasFontFor,
		songLabelLines,
		type SongLabelLine
	} from "./songLabelText.js";
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
	import { scatterPointAlpha } from "./scatterPoint.js";
	import {
		averageProgressionShare,
		axialForPoint,
		dominantClusterRegion,
		binIntoHexes,
		findHexRegions,
		gradientStrengthForZoom,
		hexKey,
		hexZoomLevel,
		type ClusterRegion,
		type HexBin,
		type HexRegion
	} from "../embedding/layout/hexBins.js";
	import {
		paintWatercolor,
		WATERCOLOR_REACH,
		type WatercolorCell
	} from "../embedding/layout/watercolorWash.js";
	import { paintHexWatercolor } from "../embedding/layout/hexWatercolorWash.js";
	import {
		PLOT_MARGIN,
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
		SELECTED_POINT_RADIUS,
		HOVER_PICK_RADIUS,
		RING_WIDTH,
		STAR_FILL_COLOR,
		OUTLINE_COLOR,
		OUTLINED_POINT_RADIUS,
		OUTLINE_WIDTH,
		OUTLINE_GLOW_BLUR,
		PLAYING_POINT_RADIUS,
		PLAYING_GLOW_BLUR,
		NOT_PLAYING_ALPHA,
		PLAYING_TWEEN_MS,
		OUTLINED_LABEL_GAP,
		OUTLINED_LABEL_LINE_HEIGHT,
		OUTLINED_LABEL_PADDING,
		AXIS_LABEL_COLOR,
		AXIS_LABEL_FONT,
		CLUSTERABLE_METHODS,
		CLUSTER_RADIUS_PADDING,
		CLUSTER_STROKE_COLOR,
		CLUSTER_STROKE_WIDTH,
		CLUSTER_UNNAMED_STROKE_ALPHA,
		CLUSTER_DASH_PATTERN,
		FAMILY_INVOLVEMENT_THRESHOLD,
		CLUSTER_DEEMPHASIZED_STROKE_ALPHA,
		CLUSTER_LABEL_COLOR,
		CLUSTER_LABEL_FONT,
		CLUSTER_NAME_FONT,
		CLUSTER_NAME_COLOR,
		CLUSTER_LABEL_GAP,
		HEX_THEME_COLORS,
		MIN_CLUSTER_SHARE_OF_HEX,
		HEX_OVERLAP_PX,
		HOVERED_CLUSTER_STROKE_COLOR,
		HOVERED_CLUSTER_STROKE_WIDTH,
		HEX_LABEL_FONT,
		HEX_LABEL_MIN_HEXES,
		HEX_LABEL_PADDING_X,
		HEX_LABEL_PADDING_Y,
		HEX_LABEL_EXTRA_PADDING_ZOOMED_OUT,
		HEX_LABEL_EXTRA_PADDING_UNTIL_ZOOM,
		HEX_LABEL_REPEAT_DISTANCE_PX,
		ROTATING_LABEL_COUNT,
		ROTATING_LABEL_HOLD_MS,
		ROTATING_LABEL_HOLD_JITTER_MS,
		ROTATING_LABEL_GAP_MS,
		ROTATING_LABEL_START_STAGGER_MS,
		ROTATING_LABEL_FADE_MS
	} from "./scatter/constants.js";
	import type { EmbeddingScatterProps as Props } from "./scatter/props.js";
	import type { NormalizedPoint, Point2D, Position } from "./scatter/types.js";
	import { normalizePoints } from "./scatter/normalizePoints.js";
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

	type ClusterGeometry = ClusterEllipse2D;
	type ClusterHit = { cluster: DensityCluster; geometry: ClusterGeometry };

	let hoveredClusterHit = $state<ClusterHit | null>(null);

	// The colored hex under the pointer in hex mode and the cluster it
	// belongs to (gray hexes don't count), plus the bins and regions from
	// the last frame so hover can look them up without re-binning.
	let hoveredHex = $state<{
		key: string;
		anchor: HoverCardAnchor;
		region: ClusterRegion;
	} | null>(null);
	let hexFrame: {
		radius: number;
		bins: Map<string, HexBin>;
		regionByKey: Map<string, ClusterRegion | null>;
	} | null = null;

	const clusterSizeByHash = $derived(
		new Map(clusters.map((cluster) => [cluster.hash, cluster.songKeys.length]))
	);

	// Labels that fit on the current hex frame without overlapping, placed
	// like song positions (0–1 across the plot). Rotating labels are picked
	// from these.
	type LabelSpot = { text: string; nx: number; ny: number };
	let labelSpots = $state<LabelSpot[]>([]);
	let rotatingLabels = $state<(LabelSpot & { id: number })[]>([]);

	const resolvedClusterNames = $derived(
		clusterNames ?? new Map<string, string>()
	);

	// Live geometry (centroid + radius) per drawn cluster, recomputed once per
	// draw() call from that frame's tween positions — cached here so hover and
	// click hit-testing don't redo an O(cluster size) reduce on every mousemove.
	let clusterGeometryCache: ClusterHit[] = [];

	let displayedPositions = new Map<string, Position>();
	let tweenFrame = 0;

	const normalizedPoints = $derived(normalizePoints(points));

	// Bounds stay based on every point so filtering never rescales the map.
	const drawablePoints = $derived(
		visibleSongKeys === null
			? normalizedPoints
			: normalizedPoints.filter((point) => visibleSongKeys.has(point.songKey))
	);

	const pointBySongKey = $derived(
		new Map(drawablePoints.map((point) => [point.songKey, point]))
	);

	const isAccented = (songKey: string): boolean =>
		accentFillColor !== null && (accentSongKeys?.has(songKey) ?? false);

	const hexMode = $derived(
		renderMode !== "dots" && progressionSharesBySongKey !== null
	);
	const watercolorMode = $derived(hexMode && renderMode === "watercolor");
	const hexWatercolorMode = $derived(
		hexMode && renderMode === "hex-watercolor"
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

	const emphasisFor = (songKey: string): number =>
		playingEmphasis.get(songKey) ?? 0;

	// Drawn as a ringed, glowing marker: outlined songs, plus a spotlit (or
	// fading-out) song that isn't outlined.
	const isMarked = (songKey: string): boolean =>
		isOutlined(songKey) || emphasisFor(songKey) > 0;

	// How much a song fades while another is spotlit.
	const spotlightFadeFor = (songKey: string): number =>
		lerp(1, NOT_PLAYING_ALPHA, playingFade * (1 - emphasisFor(songKey)));

	const lerp = (from: number, to: number, t: number): number =>
		from + (to - from) * t;

	const radiusFor = (songKey: string): number => {
		if (isMarked(songKey)) {
			return lerp(
				isOutlined(songKey) ? OUTLINED_POINT_RADIUS : POINT_RADIUS,
				PLAYING_POINT_RADIUS,
				emphasisFor(songKey)
			);
		}
		if (songKey === selectedSongKey) return SELECTED_POINT_RADIUS;
		return POINT_RADIUS;
	};

	const alphaFor = (songKey: string): number =>
		scatterPointAlpha({
			songKey,
			hoveredSongKey,
			selectedSongKey,
			coClusterSongKeys,
			emphasizedSongKeys,
			inYearSongKeys
		});

	// alphaFor, faded further when another song is spotlit.
	const outlinedAlphaFor = (songKey: string): number =>
		alphaFor(songKey) * spotlightFadeFor(songKey);

	// Marked songs, most emphasized last, so the spotlit song (and one
	// shrinking back) draws on top.
	// Labels are laid out from each marker's resting size and in a fixed
	// order, so they stay put as songs are played and stopped.
	const restingRadiusFor = (songKey: string): number =>
		isOutlined(songKey) ? OUTLINED_POINT_RADIUS : POINT_RADIUS;

	const outlinedInLabelOrder = (): string[] => [
		...new Set([...(outlinedSongKeys ?? []), ...playingEmphasis.keys()])
	];

	const outlinedInDrawOrder = (): string[] =>
		[...new Set([...(outlinedSongKeys ?? []), ...playingEmphasis.keys()])].sort(
			(a, b) => emphasisFor(a) - emphasisFor(b)
		);

	const drawAxisLabels = (context: CanvasRenderingContext2D) => {
		if (!axisLabels) return;
		context.globalAlpha = 1;
		context.fillStyle = AXIS_LABEL_COLOR;
		context.font = AXIS_LABEL_FONT;
		context.textAlign = "center";
		context.fillText(axisLabels.x, width / 2, height - PLOT_MARGIN / 3);
		context.save();
		context.translate(PLOT_MARGIN / 2, height / 2);
		context.rotate(-Math.PI / 2);
		context.fillText(axisLabels.y, 0, 0);
		context.restore();
	};

	const drawClusters = (context: CanvasRenderingContext2D) => {
		clusterGeometryCache = [];
		if (!showClusterOutlines) return;

		for (const cluster of clusters) {
			const screenPositions = cluster.songKeys
				.map((songKey) => displayedPositions.get(songKey))
				.filter((position): position is Position => position !== undefined)
				.map((position) => toScreen(position));
			if (screenPositions.length === 0) continue;

			const ellipse = fitClusterEllipse2D(
				screenPositions,
				CLUSTER_RADIUS_PADDING
			);
			if (!ellipse) continue;

			const boundingRadius = clusterEllipseBoundingRadius(ellipse);

			clusterGeometryCache.push({
				cluster,
				geometry: ellipse
			});

			const heavilyInvolvesFamily =
				!familyEmphasisSongKeys ||
				cluster.songKeys.filter((songKey) =>
					familyEmphasisSongKeys.has(songKey)
				).length /
					cluster.songKeys.length >=
					FAMILY_INVOLVEMENT_THRESHOLD;

			const name = heavilyInvolvesFamily
				? resolvedClusterNames.get(cluster.hash)
				: undefined;
			const strokeAlpha = !heavilyInvolvesFamily
				? CLUSTER_DEEMPHASIZED_STROKE_ALPHA
				: clusterAnnotationAlpha(
						emphasizedClusterHashes,
						cluster.hash,
						name !== undefined,
						CLUSTER_UNNAMED_STROKE_ALPHA
					);

			context.globalAlpha = strokeAlpha;
			context.setLineDash(CLUSTER_DASH_PATTERN);
			context.strokeStyle = CLUSTER_STROKE_COLOR;
			context.lineWidth = CLUSTER_STROKE_WIDTH;
			context.beginPath();
			context.ellipse(
				ellipse.centroid.x,
				ellipse.centroid.y,
				ellipse.semiAxisX,
				ellipse.semiAxisY,
				ellipse.rotationRadians,
				0,
				Math.PI * 2
			);
			context.stroke();
			context.setLineDash([]);
			context.globalAlpha = 1;

			if (name && showClusterNames) {
				context.globalAlpha = strokeAlpha;
				context.fillStyle = CLUSTER_NAME_COLOR;
				context.font = CLUSTER_NAME_FONT;
				context.textAlign = "center";
				context.textBaseline = "alphabetic";
				context.fillText(
					name,
					ellipse.centroid.x,
					ellipse.centroid.y - boundingRadius - CLUSTER_LABEL_GAP
				);
			}

			// song count under the hovered cluster; hex maps already show it in
			// the hex tooltip, so it'd just be a stray number when zoomed in
			if (
				renderMode !== "hex" &&
				hoveredClusterHit?.cluster.hash === cluster.hash
			) {
				context.globalAlpha = strokeAlpha;
				context.fillStyle = CLUSTER_LABEL_COLOR;
				context.font = CLUSTER_LABEL_FONT;
				context.textAlign = "center";
				context.textBaseline = "top";
				context.fillText(
					`${screenPositions.length}`,
					ellipse.centroid.x,
					ellipse.centroid.y + boundingRadius + CLUSTER_LABEL_GAP
				);
				context.textBaseline = "alphabetic";
			}
		}
	};

	const draw = () => {
		const canvas = canvasEl;
		const context = canvas?.getContext("2d");
		if (!canvas || !context || width === 0 || height === 0) return;

		const pixelRatio = pixelRatioOverride ?? (window.devicePixelRatio || 1);
		const pixelWidth = Math.round(width * pixelRatio);
		const pixelHeight = Math.round(height * pixelRatio);
		if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
		if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
		context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
		context.clearRect(0, 0, width, height);

		drawAxisLabels(context);

		const zoomLevel = hexMode ? hexZoomLevel(transform.k, HEX_ZOOM) : null;
		if (zoomLevel?.kind === "hex") {
			drawHexes(context, zoomLevel.radius);
			context.globalAlpha = 1;
			return;
		}
		hexFrame = null;
		if (untrack(() => labelSpots.length) > 0) labelSpots = [];
		const dotGradient = hexMode
			? gradientStrengthForZoom(transform.k, HEX_ZOOM)
			: 0;

		drawClusters(context);

		for (const point of pointsInDrawOrder) {
			if (isMarked(point.songKey)) continue;
			const position = displayedPositions.get(point.songKey);
			if (!position) continue;
			const screen = toScreen(position);
			const reach = SELECTED_POINT_RADIUS + RING_WIDTH * 3;
			if (
				screen.x < -reach ||
				screen.y < -reach ||
				screen.x > width + reach ||
				screen.y > height + reach
			) {
				continue;
			}
			context.globalAlpha =
				alphaFor(point.songKey) * spotlightFadeFor(point.songKey);
			context.fillStyle =
				emphasisFillColor && emphasizedSongKeys?.has(point.songKey)
					? emphasisFillColor
					: hexMode
						? regionFills.songRegionFill(point.songKey, dotGradient)
						: accentFillColor && isAccented(point.songKey)
							? accentFillColor
							: baseFillFor(context, screen, point);
			context.beginPath();
			context.arc(screen.x, screen.y, radiusFor(point.songKey), 0, Math.PI * 2);
			context.fill();
		}

		drawOutlinedSongs(context, dotGradient);
		// Only at dot zoom levels, not over hexes.
		drawOutlinedSongLabels(context);

		const emphasized = [selectedSongKey, hoveredSongKey].filter(
			(songKey): songKey is string =>
				songKey !== null && pointBySongKey.has(songKey)
		);
		for (const songKey of emphasized) {
			const position = displayedPositions.get(songKey);
			if (!position) continue;
			const screen = toScreen(position);
			context.globalAlpha = 1;
			context.strokeStyle = "#f4f4f5";
			context.lineWidth = RING_WIDTH;
			context.beginPath();
			context.arc(
				screen.x,
				screen.y,
				radiusFor(songKey) + RING_WIDTH * 2,
				0,
				Math.PI * 2
			);
			context.stroke();
		}

		context.globalAlpha = 1;
	};

	// Marked songs: a white glow, then the song's region color inside a
	// white ring, so they stand out from the dots around them. A song that
	// isn't outlined grows its ring and glow in with its emphasis.
	const drawOutlinedSongs = (
		context: CanvasRenderingContext2D,
		gradientStrength: number
	) => {
		for (const songKey of outlinedInDrawOrder()) {
			const position = displayedPositions.get(songKey);
			if (!position) continue;
			const screen = toScreen(position);
			const radius = radiusFor(songKey);
			const emphasis = emphasisFor(songKey);
			const outlined = isOutlined(songKey);
			const glowBlur = lerp(
				outlined ? OUTLINE_GLOW_BLUR : 0,
				PLAYING_GLOW_BLUR,
				emphasis
			);
			const outlineWidth = outlined ? OUTLINE_WIDTH : OUTLINE_WIDTH * emphasis;
			const reach = radius + glowBlur;
			if (
				screen.x < -reach ||
				screen.y < -reach ||
				screen.x > width + reach ||
				screen.y > height + reach
			) {
				continue;
			}
			context.save();
			context.globalAlpha = outlinedAlphaFor(songKey);
			context.beginPath();
			context.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
			context.shadowColor = OUTLINE_COLOR;
			context.shadowBlur = glowBlur;
			context.fillStyle = OUTLINE_COLOR;
			context.fill();
			context.restore();

			context.globalAlpha = outlinedAlphaFor(songKey);
			context.beginPath();
			context.arc(
				screen.x,
				screen.y,
				Math.max(0, radius - outlineWidth),
				0,
				Math.PI * 2
			);
			context.fillStyle = hexMode
				? regionFills.songRegionFill(songKey, gradientStrength)
				: OUTLINE_COLOR;
			context.fill();

			if (
				outlined &&
				songKey === hoveredSongKey &&
				songKey !== playingSongKey
			) {
				const size = radius * 0.6;
				context.save();
				context.fillStyle = "white";
				context.beginPath();
				context.moveTo(screen.x - size * 0.35, screen.y - size * 0.55);
				context.lineTo(screen.x - size * 0.35, screen.y + size * 0.55);
				context.lineTo(screen.x + size * 0.7, screen.y);
				context.closePath();
				context.fill();
				context.restore();
			}

			if (songKey === playingSongKey && emphasis > 0) {
				context.save();
				context.globalAlpha = emphasis;
				// On the dot's edge, colored by the chord playing in each stretch.
				const ringRadius = radius - 2;
				const start = -Math.PI / 2;
				const arc = (from: number, to: number, color: string) => {
					context.strokeStyle = color;
					context.beginPath();
					context.arc(
						screen.x,
						screen.y,
						ringRadius,
						start + Math.PI * 2 * from,
						start + Math.PI * 2 * to
					);
					context.stroke();
				};
				context.lineWidth = 4;
				context.lineCap = "butt";
				arc(0, 1, "rgba(0, 0, 0, 0.35)");
				if (playingChordColorSegments.length === 0)
					arc(0, playingClipProgressFraction, "white");
				for (const {
					startFraction,
					endFraction,
					chordColor
				} of playingChordColorSegments) {
					if (startFraction >= playingClipProgressFraction) break;
					arc(
						startFraction,
						Math.min(endFraction, playingClipProgressFraction),
						chordColor
					);
				}
				context.fillStyle = "white";
				const barWidth = radius * 0.2;
				const barHeight = radius * 0.7;
				for (const dx of [-barWidth * 1.1, barWidth * 1.1]) {
					context.fillRect(
						screen.x + dx - barWidth / 2,
						screen.y - barHeight / 2,
						barWidth,
						barHeight
					);
				}
				context.restore();
			}
		}
	};

	type Box = { left: number; right: number; top: number; bottom: number };

	// Where each outlined song's label was last drawn. Not reactive, since
	// drawing fills it.
	let outlinedLabelHitAreas = new Map<
		string,
		{ box: Box; hintRight: number }
	>();
	let hoveredLabelSongKey = $state<string | null>(null);

	const labelSongKeyAt = (anchor: HoverCardAnchor): string | null => {
		for (const [songKey, { box, hintRight }] of outlinedLabelHitAreas) {
			if (playingSongKey !== null && songKey !== playingSongKey) continue;
			// The hint row shown on hover counts as part of the label.
			const hovered = songKey === hoveredLabelSongKey;
			const right = hovered ? Math.max(box.right, hintRight) : box.right;
			const bottom = hovered
				? box.bottom + OUTLINED_LABEL_LINE_HEIGHT
				: box.bottom;
			if (
				anchor.x >= box.left &&
				anchor.x <= right &&
				anchor.y >= box.top &&
				anchor.y <= bottom
			) {
				return songKey;
			}
		}
		return null;
	};

	const boxesOverlap = (a: Box, b: Box): boolean =>
		a.left < b.right &&
		a.right > b.left &&
		a.top < b.bottom &&
		a.bottom > b.top;

	// Each on-screen outlinedSongKeys song's title, with its artists under it,
	// beside its marker: to the right if that's free, else left, above, or
	// below. Placed fresh each draw, so they never cover each other or a
	// marker at any zoom or canvas size; a song with no free spot goes
	// unlabeled. Drawn after every marker so none covers a label.
	const drawOutlinedSongLabels = (context: CanvasRenderingContext2D) => {
		outlinedLabelHitAreas = new Map();
		if (!outlinedSongKeys || !songSummaryByKey) return;
		const songs = outlinedInLabelOrder().flatMap((songKey) => {
			const summary = songSummaryByKey.get(songKey);
			const position = displayedPositions.get(songKey);
			if (!summary || !position) return [];
			const screen = toScreen(position);
			const radius = restingRadiusFor(songKey);
			const title =
				outlinedTitlePrefix && isOutlined(songKey)
					? `${outlinedTitlePrefix} ${summary.title}`
					: summary.title;
			const lines = songLabelLines({
				title,
				year: summary.year,
				artists: summary.artists
			});
			return [{ songKey, screen, radius, lines }];
		});
		const markers: Box[] = songs.map(({ screen, radius }) => ({
			left: screen.x - radius,
			right: screen.x + radius,
			top: screen.y - radius,
			bottom: screen.y + radius
		}));
		const onScreen = songs.filter(
			({ screen }) =>
				screen.x >= 0 &&
				screen.y >= 0 &&
				screen.x <= width &&
				screen.y <= height
		);

		const placed: Box[] = [];
		const labels: { songKey: string; lines: SongLabelLine[]; box: Box }[] = [];
		for (const { songKey, screen, radius, lines } of onScreen) {
			const textWidth = Math.max(
				...lines.map((line) =>
					line.reduce((lineWidth, { role, text }) => {
						context.font = canvasFontFor(role);
						return lineWidth + context.measureText(text).width;
					}, 0)
				)
			);
			const textHeight = lines.length * OUTLINED_LABEL_LINE_HEIGHT;
			const reach = radius + OUTLINED_LABEL_GAP;
			const candidates: [number, number][] = [
				[screen.x + reach, screen.y - textHeight / 2],
				[screen.x - reach - textWidth, screen.y - textHeight / 2],
				[screen.x - textWidth / 2, screen.y - reach - textHeight],
				[screen.x - textWidth / 2, screen.y + reach]
			];
			const free = candidates
				.map(
					([left, top]): Box => ({
						left: left - OUTLINED_LABEL_PADDING,
						right: left + textWidth + OUTLINED_LABEL_PADDING,
						top: top - OUTLINED_LABEL_PADDING,
						bottom: top + textHeight + OUTLINED_LABEL_PADDING
					})
				)
				.filter(
					(box) =>
						!placed.some((other) => boxesOverlap(box, other)) &&
						!markers.some((other) => boxesOverlap(box, other))
				);
			// Prefer a spot fully on the canvas, but one hanging off an edge
			// still counts as free.
			const box =
				free.find(
					(box) =>
						box.left >= 0 &&
						box.top >= 0 &&
						box.right <= width &&
						box.bottom <= height
				) ?? free[0];
			if (!box) continue;
			placed.push(box);
			labels.push({ songKey, lines, box });
		}

		context.textAlign = "left";
		context.textBaseline = "middle";
		context.lineJoin = "round";
		context.lineWidth = 3;
		context.strokeStyle = hexColors.labelHalo;
		context.fillStyle = hexColors.labelText;
		for (const { songKey, lines, box } of labels) {
			const songAlpha = outlinedAlphaFor(songKey);
			lines.forEach((line, index) => {
				const y =
					box.top +
					OUTLINED_LABEL_PADDING +
					(index + 0.5) * OUTLINED_LABEL_LINE_HEIGHT;
				let x = box.left + OUTLINED_LABEL_PADDING;
				for (const { role, text } of line) {
					context.globalAlpha = songAlpha * SONG_LABEL_STYLE[role].opacity;
					context.font = canvasFontFor(role);
					context.strokeText(text, x, y);
					context.fillText(text, x, y);
					x += context.measureText(text).width;
				}
			});

			// A third row, shown on hover, below the label's own rows.
			const hint = `👆 ${songKey === openSongId ? "hide" : "show"} chords`;
			const hintX = box.left + OUTLINED_LABEL_PADDING;
			const hintY =
				box.top +
				OUTLINED_LABEL_PADDING +
				(lines.length + 0.5) * OUTLINED_LABEL_LINE_HEIGHT;
			context.font = canvasFontFor("title");
			outlinedLabelHitAreas.set(songKey, {
				box,
				hintRight: hintX + context.measureText(hint).width
			});
			if (songKey === hoveredLabelSongKey) {
				context.globalAlpha = songAlpha;
				context.strokeText(hint, hintX, hintY);
				context.fillText(hint, hintX, hintY);
			}
		}
	};

	const traceHex = (
		context: CanvasRenderingContext2D,
		centerX: number,
		centerY: number,
		radius: number
	) => {
		context.beginPath();
		for (let corner = 0; corner < 6; corner++) {
			const angle = (Math.PI / 180) * (60 * corner - 30);
			const x = centerX + radius * Math.cos(angle);
			const y = centerY + radius * Math.sin(angle);
			if (corner === 0) context.moveTo(x, y);
			else context.lineTo(x, y);
		}
		context.closePath();
	};

	type BinCell = WatercolorCell & { songKeys: readonly string[] };

	let watercolorCanvas: HTMLCanvasElement | null = null;
	const watercolorLayer = (): HTMLCanvasElement => {
		watercolorCanvas ??= document.createElement("canvas");
		return watercolorCanvas;
	};

	const paintHexCells = (
		context: CanvasRenderingContext2D,
		cells: readonly BinCell[],
		screenRadius: number
	) => {
		for (const cell of cells) {
			traceHex(context, cell.x, cell.y, screenRadius + HEX_OVERLAP_PX);
			context.fillStyle = cell.fill;
			context.fill();
		}
	};

	const traceBinOutline = (
		context: CanvasRenderingContext2D,
		cell: BinCell,
		screenRadius: number
	) => {
		if (watercolorMode) {
			context.beginPath();
			context.arc(cell.x, cell.y, screenRadius, 0, Math.PI * 2);
			return;
		}
		traceHex(context, cell.x, cell.y, screenRadius + HEX_OVERLAP_PX);
	};

	const drawBinOutlines = (
		context: CanvasRenderingContext2D,
		cells: readonly BinCell[],
		screenRadius: number
	) => {
		if (selectedSongKey === null) return;
		for (const cell of cells) {
			if (!cell.songKeys.includes(selectedSongKey)) continue;
			traceBinOutline(context, cell, screenRadius);
			context.strokeStyle = "#f4f4f5";
			context.lineWidth = 2;
			context.stroke();
		}
	};

	// Neighbor across each hex edge, in traceHex's corner order: edge i runs
	// from corner i to corner i + 1 and faces 60·i degrees (y down).
	const EDGE_NEIGHBOR_OFFSETS: readonly [number, number][] = [
		[1, 0],
		[0, 1],
		[-1, 1],
		[-1, 0],
		[0, -1],
		[1, -1]
	];

	// Strokes the outer edge of every hex in the hovered cluster: only the
	// edges whose neighbor is in a different cluster (or empty), so the
	// cluster reads as one shape, including each of its separate patches.
	const drawHoveredClusterOutline = (
		context: CanvasRenderingContext2D,
		bins: Map<string, HexBin>,
		regionByKey: Map<string, ClusterRegion | null>,
		screenRadius: number
	) => {
		const clusterId = hoveredHex?.region.id;
		if (clusterId === undefined) return;
		const radius = screenRadius + HEX_OVERLAP_PX;
		const corner = (x: number, y: number, index: number) => {
			const angle = (Math.PI / 180) * (60 * index - 30);
			return [x + radius * Math.cos(angle), y + radius * Math.sin(angle)];
		};
		context.beginPath();
		for (const [key, bin] of bins) {
			if (regionByKey.get(key)?.id !== clusterId) continue;
			const x = transform.applyX(bin.x);
			const y = transform.applyY(bin.y);
			EDGE_NEIGHBOR_OFFSETS.forEach(([dq, dr], edge) => {
				const neighborKey = hexKey(bin.q + dq, bin.r + dr);
				if (regionByKey.get(neighborKey)?.id === clusterId) return;
				const [startX, startY] = corner(x, y, edge);
				const [endX, endY] = corner(x, y, edge + 1);
				context.moveTo(startX, startY);
				context.lineTo(endX, endY);
			});
		}
		context.globalAlpha = 1;
		context.strokeStyle = HOVERED_CLUSTER_STROKE_COLOR;
		context.lineWidth = HOVERED_CLUSTER_STROKE_WIDTH;
		context.lineCap = "round";
		context.stroke();
		context.lineCap = "butt";
	};

	// The hex grid for one set of positions, plot size and hex radius, in
	// base (unzoomed) pixels. Panning and zooming within one hex size reuse
	// it, so a frame only transforms, culls and paints.
	type HexLayout = {
		inputs: readonly unknown[];
		bins: Map<string, HexBin>;
		regionByKey: Map<string, ClusterRegion | null>;
		// Gray first, so colored hexes sit cleanly on top of the merged gray;
		// share is how much of the bin is its region's progression.
		orderedBins: {
			key: string;
			bin: HexBin;
			region: ClusterRegion | null;
			share: number;
		}[];
		// Connected same-cluster patches, largest first, for labels.
		labelRegions: HexRegion[];
		nameByRegionId: Map<string, string>;
	};
	let hexLayoutCache: HexLayout | null = null;

	const hexLayoutFor = (radius: number): HexLayout => {
		const inputs = [
			radius,
			displayedPositions,
			plot.width,
			plot.height,
			drawablePoints,
			clusterRegionBySongKey,
			progressionSharesBySongKey
		];
		if (
			hexLayoutCache &&
			inputs.every((input, index) => input === hexLayoutCache!.inputs[index])
		) {
			return hexLayoutCache;
		}
		const basePoints = drawablePoints.flatMap((point) => {
			const position = displayedPositions.get(point.songKey);
			if (!position) return [];
			return [{ songKey: point.songKey, ...toBasePixel(position) }];
		});
		const bins = binIntoHexes(basePoints, radius);
		const regionByKey = new Map(
			[...bins].map(([key, bin]) => [
				key,
				clusterRegionBySongKey === null
					? null
					: dominantClusterRegion(
							bin.songKeys,
							clusterRegionBySongKey,
							MIN_CLUSTER_SHARE_OF_HEX
						)
			])
		);
		const orderedBins = [...bins]
			.map(([key, bin]) => {
				const region = regionByKey.get(key) ?? null;
				return {
					key,
					bin,
					region,
					share:
						region === null
							? 0
							: averageProgressionShare(
									bin.songKeys,
									region.progressionNames,
									progressionSharesBySongKey ?? new Map()
								)
				};
			})
			.sort(
				(first, second) =>
					Number(first.region !== null) - Number(second.region !== null)
			);
		// Regions are connected hexes of the same cluster, so two clusters on
		// the same progression get separate labels. Gray hexes never do.
		const labelRegions = findHexRegions(
			bins,
			new Map(
				[...regionByKey].map(([key, region]) => [
					key,
					{ dominantName: region?.id ?? null }
				])
			),
			HEX_LABEL_MIN_HEXES
		);
		// Only regions that may be labeled.
		const nameByRegionId = new Map(
			[...regionByKey.values()].flatMap((region) =>
				region === null || !region.showLabel
					? []
					: [[region.id, region.name] as const]
			)
		);
		hexLayoutCache = {
			inputs,
			bins,
			regionByKey,
			orderedBins,
			labelRegions,
			nameByRegionId
		};
		return hexLayoutCache;
	};

	const drawHexes = (context: CanvasRenderingContext2D, radius: number) => {
		const { bins, regionByKey, orderedBins, labelRegions, nameByRegionId } =
			hexLayoutFor(radius);
		hexFrame = { radius, bins, regionByKey };

		const screenRadius = radius * transform.k;
		const gradient = gradientStrengthForZoom(transform.k, HEX_ZOOM);
		const cullMargin = screenRadius * (watercolorMode ? WATERCOLOR_REACH : 1);
		context.globalAlpha = 1;

		const cells: BinCell[] = [];
		for (const { key, bin, region, share } of orderedBins) {
			const x = transform.applyX(bin.x);
			const y = transform.applyY(bin.y);
			if (
				x < -cullMargin ||
				y < -cullMargin ||
				x > width + cullMargin ||
				y > height + cullMargin
			) {
				continue;
			}
			cells.push({
				key,
				songKeys: bin.songKeys,
				x,
				y,
				fill:
					region === null
						? hexColors.ambiguous
						: regionFills.regionFill(region.name, share, gradient)
			});
		}

		if (watercolorMode) {
			paintWatercolor(context, watercolorLayer(), cells, screenRadius);
		} else if (hexWatercolorMode) {
			paintHexWatercolor(
				context,
				watercolorLayer(),
				cells,
				screenRadius,
				(ctx, x, y) => traceHex(ctx, x, y, screenRadius + HEX_OVERLAP_PX)
			);
		} else {
			paintHexCells(context, cells, screenRadius);
		}
		drawBinOutlines(context, cells, screenRadius);
		drawHoveredClusterOutline(context, bins, regionByKey, screenRadius);

		// One label per connected region, biggest first, skipping any that
		// would collide with a label already placed or fall off screen, or
		// that labelNames leaves out.
		if (!showLabels && !showRotatingLabels) {
			if (untrack(() => labelSpots.length) > 0) labelSpots = [];
			return;
		}
		const spots: LabelSpot[] = [];
		context.font = HEX_LABEL_FONT;
		context.textAlign = "center";
		context.textBaseline = "middle";
		context.lineJoin = "round";
		const placed: {
			left: number;
			right: number;
			top: number;
			bottom: number;
			text: string;
			x: number;
			y: number;
		}[] = [];
		// A cluster can break into several patches; only its biggest is a
		// label candidate (regions come largest first). If that one doesn't
		// fit, the cluster goes unlabeled rather than labeling a stray patch.
		const consideredRegionIds = new Set<string>();
		const extraPadding =
			HEX_LABEL_EXTRA_PADDING_ZOOMED_OUT *
			Math.max(
				0,
				1 -
					(transform.k - MIN_ZOOM) /
						(HEX_LABEL_EXTRA_PADDING_UNTIL_ZOOM - MIN_ZOOM)
			);
		const paddingX = HEX_LABEL_PADDING_X + extraPadding;
		const paddingY = HEX_LABEL_PADDING_Y + extraPadding;
		for (const region of labelRegions) {
			if (consideredRegionIds.has(region.name)) continue;
			consideredRegionIds.add(region.name);
			const labelText = nameByRegionId.get(region.name);
			if (labelText === undefined) continue;
			if (labelNameSet && !labelNameSet.has(normalizeName(labelText))) {
				continue;
			}
			const x = transform.applyX(region.x);
			const y = transform.applyY(region.y);
			if (
				placed.some(
					(other) =>
						other.text === labelText &&
						Math.hypot(other.x - x, other.y - y) < HEX_LABEL_REPEAT_DISTANCE_PX
				)
			) {
				continue;
			}
			const textWidth = context.measureText(labelText).width;
			const box = {
				left: x - textWidth / 2 - paddingX,
				right: x + textWidth / 2 + paddingX,
				top: y - paddingY,
				bottom: y + paddingY,
				text: labelText,
				x,
				y
			};
			if (
				box.left < 0 ||
				box.right > width ||
				box.top < 0 ||
				box.bottom > height
			) {
				continue;
			}
			if (
				placed.some(
					(other) =>
						box.left < other.right &&
						box.right > other.left &&
						box.top < other.bottom &&
						box.bottom > other.top
				)
			) {
				continue;
			}
			placed.push(box);
			// Stored like song positions (0–1 across the plot), so a label
			// already showing stays put on the map when the plot resizes.
			spots.push({
				text: labelText,
				...view.fromBasePixel(viewSize, region)
			});
			if (!showLabels) continue;
			context.strokeStyle = hexColors.labelHalo;
			context.lineWidth = 3;
			context.strokeText(labelText, x, y);
			context.fillStyle = hexColors.labelText;
			context.fillText(labelText, x, y);
		}
		labelSpots = spots;
	};

	const hexKeyAtAnchor = (anchor: HoverCardAnchor): string | null => {
		if (!hexFrame) return null;
		const [baseX, baseY] = transform.invert([anchor.x, anchor.y]);
		const { q, r } = axialForPoint(baseX, baseY, hexFrame.radius);
		const key = hexKey(q, r);
		return hexFrame.bins.has(key) ? key : null;
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

	const clusterHitArea = (geometry: ClusterGeometry): number =>
		geometry.semiAxisX * geometry.semiAxisY;

	const findClusterAt = (anchor: HoverCardAnchor): ClusterHit | null =>
		clusterGeometryCache.reduce<ClusterHit | null>((best, hit) => {
			if (!pointInsideClusterEllipse2D(anchor, hit.geometry)) return best;
			return !best ||
				clusterHitArea(hit.geometry) < clusterHitArea(best.geometry)
				? hit
				: best;
		}, null);

	// The nearest outlinedSongKeys song whose marker is under the anchor, give
	// or take the same slack plain dots get. Checked before plain dots, since
	// the markers sit on top of them.
	const findOutlinedSongAtAnchor = (anchor: HoverCardAnchor): string | null => {
		if (!outlinedSongKeys) return null;
		let hit: string | null = null;
		let hitDistance = OUTLINED_POINT_RADIUS + HOVER_PICK_RADIUS - POINT_RADIUS;
		for (const songKey of outlinedSongKeys) {
			const position = displayedPositions.get(songKey);
			if (!position) continue;
			const screen = toScreen(position);
			const distance = Math.hypot(screen.x - anchor.x, screen.y - anchor.y);
			if (distance < hitDistance) {
				hit = songKey;
				hitDistance = distance;
			}
		}
		return hit;
	};

	const findPointAtAnchor = (anchor: HoverCardAnchor): string | null => {
		const outlined = findOutlinedSongAtAnchor(anchor);
		if (outlined !== null) return outlined;
		const hit = drawablePoints.reduce<{
			songKey: string | null;
			distance: number;
		}>(
			(best, point) => {
				const position = displayedPositions.get(point.songKey);
				if (!position) return best;
				const screen = toScreen(position);
				const distance = Math.hypot(screen.x - anchor.x, screen.y - anchor.y);
				return distance < best.distance
					? { songKey: point.songKey, distance }
					: best;
			},
			{ songKey: null, distance: HOVER_PICK_RADIUS }
		);
		return hit.songKey;
	};

	const findPointAt = (event: MouseEvent): string | null => {
		if (!containerEl) return null;
		return findPointAtAnchor(anchorFromMouseEvent(event, containerEl));
	};

	const handlePointerMove = (event: MouseEvent) => {
		if (!containerEl) return;
		clickGuard.onPointerMove(event);
		if (!hoverable) return;
		const anchor = anchorFromMouseEvent(event, containerEl);
		if (hexFrame) {
			const key = hexKeyAtAnchor(anchor);
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
		hoveredLabelSongKey = onSongChordsToggle ? labelSongKeyAt(anchor) : null;
		const songKey = findPointAtAnchor(anchor);
		hoveredSongKey = songKey;
		delayedTooltip.setHover(songKey, songKey === null ? null : anchor);
		hoveredClusterHit = songKey === null ? findClusterAt(anchor) : null;
	};

	const handlePointerLeave = () => {
		hoveredHex = null;
		hoveredSongKey = null;
		delayedTooltip.clearHover();
		hoveredClusterHit = null;
		hoveredLabelSongKey = null;
	};

	const handleClick = (event: MouseEvent) => {
		if (clickGuard.shouldSuppressClick()) return;
		if (!containerEl) return;
		const anchor = anchorFromMouseEvent(event, containerEl);
		const clickedLabelSongKey =
			onSongChordsToggle && !hexFrame ? labelSongKeyAt(anchor) : null;
		if (clickedLabelSongKey !== null) {
			onSongChordsToggle?.(clickedLabelSongKey);
			return;
		}
		// Outlined songs are only drawn once zoomed in to dots, so they can
		// only be clicked then.
		const outlinedSongKey = hexFrame ? null : findOutlinedSongAtAnchor(anchor);
		const clickedSongKey = hexFrame
			? null
			: (outlinedSongKey ?? findPointAtAnchor(anchor));
		const songIsActive = playingSongKey !== null || openSongId !== null;
		if (hexMode && !hexFrame && songIsActive) {
			if (clickedSongKey === null || clickedSongKey === playingSongKey) {
				// Off any dot, or on the playing one: just deselect.
				onOutlinedSongClick?.(null);
				return;
			}
		}
		if (outlinedSongKey !== null || clickedSongKey === null) {
			onOutlinedSongClick?.(outlinedSongKey);
		}
		if (
			hexMode &&
			!hexFrame &&
			onSongChordsToggle &&
			outlinedSongKey === null &&
			clickedSongKey !== null
		) {
			// A plain song replaces whatever was playing, and opens its chords.
			if (playingSongKey !== null) onOutlinedSongClick?.(null);
			onSongChordsToggle(clickedSongKey);
			return;
		}
		if (hexMode) {
			const hexKey = hexFrame ? hexKeyAtAnchor(anchor) : null;
			const songKey = hexFrame ? null : findPointAtAnchor(anchor);
			const region = hexFrame
				? hexKey === null
					? null
					: (hexFrame.regionByKey.get(hexKey) ?? null)
				: songKey === null
					? null
					: (clusterRegionBySongKey?.get(songKey) ?? null);
			onClusterClick?.(region?.name ?? null, outlinedSongKey);
		}
		if (hexFrame) {
			// Clicking a hex zooms in on it just far enough to show dots.
			if (
				movable &&
				canvasEl &&
				zoomBehavior &&
				hexKeyAtAnchor(anchor) !== null
			) {
				select(canvasEl)
					.transition()
					.duration(HEX_CLICK_ZOOM_MS)
					.call(zoomBehavior.scaleTo, HEX_FOCUS_SCALE, [anchor.x, anchor.y]);
			}
			return;
		}
		if (!hoverable) return;
		const songKey = findPointAt(event);
		onSelect(songKey === selectedSongKey ? null : songKey);
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

	$effect(() => {
		// Tracked so the canvas repaints on resize, zoom and selection changes.
		void width;
		void height;
		void transform;
		void hoveredSongKey;
		void selectedSongKey;
		void coClusterSongKeys;
		void drawablePoints;
		void clusters;
		void emphasizedClusterHashes;
		void resolvedClusterNames;
		void hoveredClusterHit;
		void emphasizedSongKeys;
		void inYearSongKeys;
		void colorMode;
		void showClusterOutlines;
		void showClusterNames;
		void familyEmphasisSongKeys;
		void emphasisFillColor;
		void pointsInDrawOrder;
		void accentFillColor;
		void hexMode;
		void watercolorMode;
		void hexWatercolorMode;
		void regionColorByName;
		void hoveredHex;
		void clusterRegionBySongKey;
		void hexColors;
		void showLabels;
		void showRotatingLabels;
		void labelNameSet;
		void outlinedSongKeys;
		void songSummaryByKey;
		void playingClipProgressFraction;
		void hoveredLabelSongKey;
		void openSongId;
		void playingChordColorSegments;
		draw();
	});

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
