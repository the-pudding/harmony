<script lang="ts">
	import { onDestroy, untrack } from "svelte";
	import { fade } from "svelte/transition";
	import {
		easeCubicInOut,
		interpolateLab,
		select,
		zoom,
		zoomIdentity,
		type ZoomTransform
	} from "d3";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import coreProgressions from "../../../../data/core-progressions.js";
	import { type DensityCluster } from "../embedding/clustering/densityClusters.js";
	import {
		clusterEllipseBoundingRadius,
		fitClusterEllipse2D,
		pointInsideClusterEllipse2D,
		type ClusterEllipse2D
	} from "../embedding/clustering/clusterBounds.js";
	import {
		UMAP_DRIVEN_METHODS,
		type EmbeddingMethod
	} from "../embedding/reducers/types.js";
	import { fillStyleForGroupShares } from "./groupColorBlend.js";
	import type { MapColorMode } from "../colorMode.js";
	import { clusterAnnotationAlpha } from "./clusterAnnotationStyle.js";
	import SongTooltip from "../../shared/SongTooltip.svelte";
	import HexSongTooltip from "./HexSongTooltip.svelte";
	import { createDelayedHoverTooltip } from "../../shared/delayedHoverTooltip.svelte.js";
	import { createClickAfterDragGuard } from "../../shared/clickAfterDragGuard.js";
	import {
		anchorFromMouseEvent,
		hoverCardStyle,
		type HoverCardAnchor
	} from "../../shared/hoverCardPosition.js";
	import type { ScatterAxisLabels, ScatterPoint } from "./scatterPoint.js";
	import { scatterPointAlpha } from "./scatterPoint.js";
	import {
		assignRegionColors,
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
		type HexRegion,
		type ProgressionShare
	} from "../embedding/layout/hexBins.js";
	import {
		paintWatercolor,
		WATERCOLOR_REACH,
		type WatercolorCell
	} from "../embedding/layout/watercolorWash.js";
	import { paintHexWatercolor } from "../embedding/layout/hexWatercolorWash.js";

	// ── Layout & zoom ─────────────────────────────────────────────────────
	// Space between the canvas edge and the plotted area, in pixels.
	const PLOT_MARGIN = 32;
	const MIN_ZOOM = 1;
	const MAX_ZOOM = 40;
	// How far past the plot's edges the view can pan, in screen pixels.
	const PAN_EDGE_PADDING = 200;
	// Tiny per-song offset (in normalized units) so stacked songs separate.
	const JITTER_AMPLITUDE = 0.004;
	// Hex mode: hex radius on screen at zoom 1, the zoom where hexes give way
	// to dots, and how gently hexes shrink on screen as you zoom in (they go
	// from 7px at 1× to about 5px just before dots take over).
	const HEX_ZOOM = {
		baseScreenRadius: 7,
		dotsAtZoom: 4,
		shrinkExponent: 0.25
	} as const;

	// ── Focus & camera moves ──────────────────────────────────────────────
	// Zoom used when focusing a single song.
	const DEFAULT_FOCUS_SCALE = 8;
	const FOCUS_TRANSITION_MS = 900;
	// How much of the screen a focused cluster fills. Its bounding box is
	// scaled to fit within this fraction of both the viewport's width and
	// height, leaving breathing room around the edge.
	const CLUSTER_FOCUS_PADDING = 0.65;
	const MAX_CLUSTER_FOCUS_SCALE = 24;
	// Same idea, for hex mode with a focusFrame: the cluster fits within this
	// fraction of the frame's height (and the viewport's width), but zooms at
	// least to HEX_FOCUS_SCALE so its songs show as dots.
	const FRAME_FOCUS_FILL = 0.85;
	// Hex mode without a focusFrame ignores fit and zooms just past the zoom
	// where hexes turn into dots, so the cluster's songs show as dots.
	const HEX_FOCUS_SCALE = HEX_ZOOM.dotsAtZoom * 1.01;
	// Flying to an off-screen song zooms out a bit on the way there.
	const FLY_TO_ZOOM_OUT_FACTOR = 0.75;
	const FLY_TO_TRANSITION_MS = 1300;
	// Clicking a hex zooms in by this factor.
	const HEX_CLICK_ZOOM_FACTOR = 2.5;
	const HEX_CLICK_ZOOM_MS = 450;
	// Points animating between layouts.
	const TWEEN_DURATION_MS = 700;

	// ── Points ────────────────────────────────────────────────────────────
	const POINT_RADIUS = 3;
	const SELECTED_POINT_RADIUS = 6;
	const HOVER_PICK_RADIUS = 12;
	const RING_WIDTH = 1.5;
	// Used when colorMode is "off" — a plain, star-like white so a
	// highlighted song/family reads clearly against an otherwise uncolored
	// field.
	const STAR_FILL_COLOR = "#e4e4e7";

	// ── Outlined (called-out) songs & their labels ────────────────────────
	const OUTLINE_COLOR = "#ffffff";
	const OUTLINED_POINT_RADIUS = 10;
	const OUTLINE_WIDTH = 3;
	const OUTLINE_GLOW_BLUR = 10;
	// playingSongKey's marker is bigger with a wider glow, and the other
	// outlined songs (and their labels) fade back to this alpha.
	const PLAYING_POINT_RADIUS = 18;
	const PLAYING_GLOW_BLUR = 28;
	const NOT_PLAYING_ALPHA = 0.3;
	// How long the playing marker takes to grow (and the last one to shrink).
	const PLAYING_TWEEN_MS = 400;
	const OUTLINED_LABEL_TITLE_FONT =
		"700 11px 'JetBrains Mono', ui-monospace, monospace";
	const OUTLINED_LABEL_ARTIST_FONT =
		"500 10px 'JetBrains Mono', ui-monospace, monospace";
	// Space between a marker's edge and its label.
	const OUTLINED_LABEL_GAP = 6;
	const OUTLINED_LABEL_LINE_HEIGHT = 13;
	// Empty space kept around each label so it doesn't touch its neighbors.
	const OUTLINED_LABEL_PADDING = 3;

	// ── Axes ──────────────────────────────────────────────────────────────
	const AXIS_LABEL_COLOR = "rgba(161, 161, 170, 0.7)";
	const AXIS_LABEL_FONT = '10px "JetBrains Mono", ui-monospace, monospace';

	// ── Cluster outlines (dot mode) ───────────────────────────────────────
	// Density clustering is only meaningful over layouts UMAP actually produced
	// (see UMAP_DRIVEN_METHODS) — PCA/feature-axis positions are linear
	// projections or hand-designed axes where geometric proximity doesn't mean
	// "similar songs", so DBSCAN circles there would be visually plausible but
	// semantically noise.
	const CLUSTERABLE_METHODS = new Set<EmbeddingMethod>(UMAP_DRIVEN_METHODS);
	const CLUSTER_RADIUS_PADDING = 8;
	const CLUSTER_STROKE_COLOR = "#e4e4e7";
	const CLUSTER_STROKE_WIDTH = 2;
	const CLUSTER_UNNAMED_STROKE_ALPHA = 0.72;
	const CLUSTER_DASH_PATTERN = [7, 5];
	// A cluster "heavily involves" a highlighted family when at least this
	// fraction of its songs are in familyEmphasisSongKeys; below that its
	// outline fades to CLUSTER_DEEMPHASIZED_STROKE_ALPHA and its name hides.
	const FAMILY_INVOLVEMENT_THRESHOLD = 0.5;
	const CLUSTER_DEEMPHASIZED_STROKE_ALPHA = 0.15;
	const CLUSTER_LABEL_COLOR = "rgba(244, 244, 245, 0.9)";
	const CLUSTER_LABEL_FONT = '10px "JetBrains Mono", ui-monospace, monospace';
	const CLUSTER_NAME_FONT =
		'600 11px "JetBrains Mono", ui-monospace, monospace';
	const CLUSTER_NAME_COLOR = "#f4f4f5";
	// Space between a cluster's outline and its label.
	const CLUSTER_LABEL_GAP = 6;

	// ── Hex mode: colors ──────────────────────────────────────────────────
	// Dark-surface categorical steps (dataviz reference palette). Color only
	// keeps neighboring regions apart; labels and tooltips name them.
	const REGION_PALETTE = [
		"#3987e5",
		"#d95926",
		"#199e70",
		"#c98500",
		"#d55181",
		"#008300",
		"#9085e9",
		"#e66767"
	] as const;
	// Pairs that failed or warned the palette validator (colorblind or
	// normal-vision separation) on this page's #09090b surface. Neighboring
	// regions never get one of these pairs.
	const CONFUSABLE_REGION_PAIRS = new Set(
		[
			["#3987e5", "#9085e9"],
			["#d95926", "#c98500"],
			["#d95926", "#d55181"],
			["#d95926", "#008300"],
			["#d95926", "#e66767"],
			["#199e70", "#d55181"],
			["#199e70", "#008300"],
			["#199e70", "#e66767"],
			["#c98500", "#008300"],
			["#c98500", "#e66767"],
			["#d55181", "#e66767"]
		].map(([a, b]) => (a < b ? `${a}|${b}` : `${b}|${a}`))
	);
	// Per theme: what a hex fades toward when it's only partly its main
	// progression (faded), the fill for songs or hexes with no matched
	// progression (unmatched), hexes and songs outside a clearly defined
	// cluster (ambiguous), and region label text with its halo.
	const HEX_THEME_COLORS = {
		dark: {
			faded: "#2a2a2e",
			unmatched: "#27272a",
			ambiguous: "#3f3f46",
			labelText: "#f4f4f5",
			labelHalo: "#09090b"
		},
		light: {
			faded: "#ececee",
			unmatched: "#f4f4f5",
			ambiguous: "#e4e4e7",
			labelText: "#18181b",
			labelHalo: "#ffffff"
		}
	} as const;
	// Faintest a hex can get, so even a mixed hex keeps a hint of its hue.
	const MIN_REGION_TINT = 0.2;
	// A hex takes a cluster's color only when that cluster holds at least
	// this share of its songs; otherwise it's unclustered or split, and gray.
	const MIN_CLUSTER_SHARE_OF_HEX = 0.5;
	// Hexes are drawn slightly oversized so neighbors overlap and touch with
	// no seams or gaps between them.
	const HEX_OVERLAP_PX = 0.5;
	// Border drawn around the hovered hex region.
	const HOVERED_CLUSTER_STROKE_COLOR = "#ffffff";
	const HOVERED_CLUSTER_STROKE_WIDTH = 2;

	// ── Hex mode: region labels ───────────────────────────────────────────
	const HEX_LABEL_FONT = "500 10px 'JetBrains Mono', ui-monospace, monospace";
	// Any colored region this many hexes or larger can be labeled.
	const HEX_LABEL_MIN_HEXES = 1;
	// Empty space kept around each label so neighboring labels don't touch.
	const HEX_LABEL_PADDING_X = 6;
	const HEX_LABEL_PADDING_Y = 6;
	// Extra space around labels when fully zoomed out, where they'd otherwise
	// crowd; it eases away by HEX_LABEL_EXTRA_PADDING_UNTIL_ZOOM.
	const HEX_LABEL_EXTRA_PADDING_ZOOMED_OUT = 4;
	const HEX_LABEL_EXTRA_PADDING_UNTIL_ZOOM = 2;
	// Nearby clusters often share a progression; skip a label when the same
	// name is already shown within this distance.
	const HEX_LABEL_REPEAT_DISTANCE_PX = 150;
	// Rotating labels: ROTATING_LABEL_COUNT slots, each showing a label for
	// about ROTATING_LABEL_HOLD_MS (± jitter), fading it out and, after a
	// short gap, fading in a different one. Slots start together but swap at
	// staggered times, so 4–5 labels are always up and they change one by one.
	const ROTATING_LABEL_COUNT = 5;
	const ROTATING_LABEL_HOLD_MS = 6000;
	const ROTATING_LABEL_HOLD_JITTER_MS = 1500;
	const ROTATING_LABEL_GAP_MS = 400;
	const ROTATING_LABEL_START_STAGGER_MS = 250;
	const ROTATING_LABEL_FADE_MS = 800;

	type Props = {
		points: ScatterPoint[];
		songByKey: Map<string, GroupedSong>;
		// For songs missing from songByKey: loadSong fetches one on hover for
		// its tooltip, and songSummaryByKey names it while that loads.
		loadSong?: ((songKey: string) => Promise<GroupedSong | null>) | null;
		songSummaryByKey?: ReadonlyMap<
			string,
			{ title: string; artists: readonly string[] }
		> | null;
		selectedSongKey: string | null;
		coClusterSongKeys: Set<string>;
		visibleSongKeys?: Set<string> | null;
		inYearSongKeys?: Set<string> | null;
		axisLabels?: ScatterAxisLabels | null;
		method: EmbeddingMethod;
		clusters: DensityCluster[];
		emphasizedClusterHashes: Set<string> | null;
		onSelect: (songKey: string | null) => void;
		// Optional scripted zoom target (used by /story). Omitted entirely for
		// normal interactive use — undefined means this feature is unused, so
		// user-driven pan/zoom is never overridden. Pass a songKey to animate
		// the view centered on it, or null to animate back out to the full view.
		focusSongKey?: string | null;
		focusScale?: number;
		// Optional scripted zoom onto a whole named cluster (by its resolved
		// display name, e.g. "axis") rather than one song — fits the cluster's
		// current member bounds to the viewport. Same undefined/null contract
		// as focusSongKey; takes priority over it when both are set.
		focusClusterName?: string | null;
		// The part of the canvas a focused cluster should fill, in screen
		// pixels from its top (e.g. the space below text over the map). In
		// hex mode the cluster is scaled to almost fill its height and
		// centered in it; otherwise the cluster focuses as usual.
		focusFrame?: { top: number; height: number } | null;
		// Shifts the resting view and focus targets down by this many screen
		// pixels, e.g. to leave room for text over the top of the map.
		// Changing it animates the view to the new resting position.
		offsetY?: number;
		// Optional blanket emphasis set (used by /story to highlight a whole
		// progression family rather than one song's cluster). When set,
		// everything NOT in it dims — independent of selectedSongKey /
		// coClusterSongKeys, so it works with no specific song selected at
		// all. Omit (or null) for no effect.
		emphasizedSongKeys?: Set<string> | null;
		// "groups" colors dots by their progression-family blend (the
		// default), "homogeneity" by each point's homogeneityColor, and "off"
		// leaves a plain starfield so a highlighted song/family stands out.
		colorMode?: MapColorMode;
		// Draw the dashed cluster outlines + names. Defaults to true (existing
		// behavior); /story defaults this off per beat.
		showClusterOutlines?: boolean;
		// Name each outlined cluster above its outline. Defaults to true.
		showClusterNames?: boolean;
		// Optional song set used to judge, per cluster, whether it "heavily
		// involves" a highlighted family (used by /story alongside
		// highlightFamily + showClusterOutlines) — a cluster whose members
		// are mostly NOT in this set draws a faint outline with its name
		// hidden, rather than the normal full treatment. Distinct from
		// emphasizedSongKeys (which fades dots) so a plain song highlight
		// with outlines on doesn't also mute every other cluster's outline.
		// Omit (or null) for normal treatment of every cluster.
		familyEmphasisSongKeys?: Set<string> | null;
		// Fill color for a song in emphasizedSongKeys, overriding the group
		// color / STAR_FILL_COLOR so those dots stand out regardless of
		// colorMode. Opt-in per caller (e.g. harmony-map's artist
		// mode) — omit (or null) to leave emphasized dots colored normally,
		// distinguished only by alpha (e.g. /story's family highlights).
		emphasisFillColor?: string | null;
		// Fill color for songs in accentSongKeys. Unlike emphasizedSongKeys it
		// dims nothing, so the rest of the map keeps its structure. Accented
		// dots are drawn last so they sit on top of the dots around them.
		// emphasisFillColor wins when a song is in both sets.
		accentSongKeys?: Set<string> | null;
		accentFillColor?: string | null;
		// Songs drawn as larger, white-ringed, glowing dots on top of
		// everything else, with their titles and artists beside them. In hex
		// mode, only once zoomed in to dots.
		outlinedSongKeys?: Set<string> | null;
		// One of outlinedSongKeys to call out above the rest (e.g. the song
		// playing): drawn bigger and on top, with the others faded.
		playingSongKey?: string | null;
		// "hex" groups songs into hexagons whose size follows the zoom: big
		// when zoomed out, smaller as you zoom in, plain dots near max zoom.
		// Each hex takes the color of its main progression, faded when the
		// hex is only partly that progression. Needs progressionSharesBySongKey.
		// "watercolor" bins and colors the same way, but paints each bin as a
		// soft blob so neighboring regions bleed into each other.
		renderMode?: "dots" | "hex" | "watercolor" | "hex-watercolor";
		// Each song's progressions with their share of its matched chords.
		progressionSharesBySongKey?: ReadonlyMap<
			string,
			readonly ProgressionShare[]
		> | null;
		// The cluster each song belongs to, for clusters with a clear main
		// progression. Hex mode colors by cluster: songs missing from this
		// map, and hexes no single cluster holds half of, are drawn gray.
		clusterRegionBySongKey?: ReadonlyMap<string, ClusterRegion> | null;
		// Outline labels by cluster hash. When omitted, clusters are unnamed.
		clusterNames?: ReadonlyMap<string, string> | null;
		// User interaction, both on by default. movable = drag, wheel, pinch
		// and double-click zoom, and click-to-zoom on hexes; hoverable = hover
		// tooltips and outlines, and click to select a song. Scripted focus
		// (focusSongKey / focusClusterName) still works with them off.
		movable?: boolean;
		hoverable?: boolean;
		// Hex-mode region labels drawn all at once on the map.
		showLabels?: boolean;
		// Hex-mode region labels that fade in one at a time at random spots,
		// a few seconds apart. Use with showLabels off.
		showRotatingLabels?: boolean;
		// Only label regions with these names (case-insensitive), for either
		// kind of label. Omit (or null) to label any region that fits.
		labelNames?: readonly string[] | null;
		// Hex-mode colors for the surface the map sits on. "light" uses
		// lighter grays and dark label text; the canvas itself is always
		// transparent, so the page provides the background.
		theme?: "dark" | "light";
		// Called with the pan/zoom transform whenever it changes (user or
		// scripted), e.g. to show where the view is on an overview map.
		onTransformChange?: ((transform: ZoomTransform) => void) | null;
		// Called on every click on the map with the outlinedSongKeys song
		// under the pointer, or null when the click missed them all.
		onOutlinedSongClick?: ((songKey: string | null) => void) | null;
		// Canvas pixels per CSS pixel. Defaults to the screen's; lower it when
		// the map is shown scaled down (e.g. an inset) to save memory.
		pixelRatio?: number | null;
		// Hex mode: a simpler song tooltip (see HexSongTooltip) that shows the
		// song's full chords when C is pressed.
		simpleSongTooltip?: boolean;
	};

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
		playingSongKey = null,
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
		pixelRatio: pixelRatioOverride = null,
		simpleSongTooltip = false
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

	type NormalizedPoint = ScatterPoint & { nx: number; ny: number };
	type Position = { nx: number; ny: number };

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

	// Stable per-song offset so songs sharing an identical vector stay pickable.
	const jitterFor = (songKey: string): Position => {
		const hash = [...songKey].reduce(
			(accumulator, character) =>
				(accumulator * 31 + character.charCodeAt(0)) % 100003,
			7
		);
		return {
			nx: ((hash % 101) / 100 - 0.5) * JITTER_AMPLITUDE * 2,
			ny: (((hash / 101) % 101) / 100 - 0.5) * JITTER_AMPLITUDE * 2
		};
	};

	const normalize = (value: number, min: number, max: number): number =>
		max === min ? 0.5 : (value - min) / (max - min);

	const normalizedPoints = $derived.by((): NormalizedPoint[] => {
		if (points.length === 0) return [];
		const bounds = points.reduce(
			(extent, point) => ({
				minX: Math.min(extent.minX, point.x),
				maxX: Math.max(extent.maxX, point.x),
				minY: Math.min(extent.minY, point.y),
				maxY: Math.max(extent.maxY, point.y)
			}),
			{
				minX: Infinity,
				maxX: -Infinity,
				minY: Infinity,
				maxY: -Infinity
			}
		);
		return points.map((point) => {
			const jitter = jitterFor(point.songKey);
			return {
				...point,
				nx: normalize(point.x, bounds.minX, bounds.maxX) + jitter.nx,
				ny: normalize(point.y, bounds.minY, bounds.maxY) + jitter.ny
			};
		});
	});

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

	// One color per cluster progression, from where its clusters sit on the
	// map, so nearby regions never share a color or use a confusable pair.
	// Clusters built on the same progression share its color.
	const regionColorByName = $derived.by((): Map<string, string> => {
		if (!hexMode || clusterRegionBySongKey === null) return new Map();
		const totals = new Map<string, { x: number; y: number; weight: number }>();
		for (const point of normalizedPoints) {
			const dominant = clusterRegionBySongKey.get(point.songKey);
			if (!dominant) continue;
			const total = totals.get(dominant.name) ?? { x: 0, y: 0, weight: 0 };
			total.x += point.nx;
			total.y += point.ny;
			total.weight += 1;
			totals.set(dominant.name, total);
		}
		return assignRegionColors(
			[...totals].map(([name, total]) => ({
				name,
				x: total.x / total.weight,
				y: total.y / total.weight,
				weight: total.weight
			})),
			REGION_PALETTE,
			CONFUSABLE_REGION_PAIRS
		);
	});

	// share 1 → the progression's full color; lower shares fade toward
	// the theme's faded color. gradientStrength scales how much fading is applied,
	// so zoomed-out hexes read as solid regions.
	// Lab, not HCL: blending toward a near-gray in HCL rotates the hue
	// (red drifts to magenta), which makes one cluster look multicolored.
	const regionInterpolatorByName = $derived(
		new Map(
			[...regionColorByName].map(([name, color]) => [
				name,
				interpolateLab(hexColors.faded, color)
			])
		)
	);

	// A progression's map color: the color of a region built on it.
	const regionColorByProgressionName = $derived.by(() => {
		const colors = new Map<string, string>();
		for (const region of new Set(clusterRegionBySongKey?.values() ?? [])) {
			const color = regionColorByName.get(region.name);
			if (color === undefined) continue;
			for (const name of region.progressionNames) {
				if (!colors.has(name)) colors.set(name, color);
			}
		}
		return colors;
	});

	const regionFill = (
		name: string | null,
		share: number,
		gradientStrength: number
	): string => {
		const interpolate =
			name === null ? undefined : regionInterpolatorByName.get(name);
		if (!interpolate) return hexColors.unmatched;
		const strength =
			1 - gradientStrength * (1 - Math.min(1, Math.max(0, share)));
		return interpolate(MIN_REGION_TINT + (1 - MIN_REGION_TINT) * strength);
	};

	// A song's color at dot zoom: its cluster's color, faded by how much of
	// the song is that cluster's progression; gray outside clear clusters.
	const songRegionFill = (
		songKey: string,
		gradientStrength: number
	): string => {
		const region = clusterRegionBySongKey?.get(songKey);
		if (!region) return hexColors.ambiguous;
		return regionFill(
			region.name,
			averageProgressionShare(
				[songKey],
				region.progressionNames,
				progressionSharesBySongKey ?? new Map()
			),
			gradientStrength
		);
	};

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

	// Membership only — geometry is drawn from each frame's live tween
	// positions in drawClusters(), so circles animate along with their dots.
	const plotWidth = $derived(Math.max(0, width - PLOT_MARGIN * 2));
	const plotHeight = $derived(Math.max(0, height - PLOT_MARGIN * 2));

	const toBasePixel = (position: Position): { x: number; y: number } => ({
		x: PLOT_MARGIN + position.nx * plotWidth,
		y: PLOT_MARGIN + (1 - position.ny) * plotHeight
	});

	const toScreen = (position: Position): { x: number; y: number } => {
		const base = toBasePixel(position);
		return { x: transform.applyX(base.x), y: transform.applyY(base.y) };
	};

	const isOnScreen = (screen: { x: number; y: number }): boolean =>
		screen.x >= 0 && screen.x <= width && screen.y >= 0 && screen.y <= height;

	const transformCenteredOn = (
		base: { x: number; y: number },
		scale: number
	): ZoomTransform =>
		zoomIdentity
			.scale(scale)
			.translate(
				width / (2 * scale) - base.x,
				(height / 2 + offsetY) / scale - base.y
			);

	// Keeps the plot (its full unzoomed frame, margins included) from being
	// panned off screen: each edge can come at most PAN_EDGE_PADDING past the
	// matching viewport edge, and the top edge is measured from offsetY down
	// (below any text over the map). The padding lets clusters near the edge
	// get roughly centered. Used for user gestures and scripted targets alike.
	const constrainTransform = (t: ZoomTransform): ZoomTransform => {
		const clamp = (value: number, a: number, b: number) =>
			Math.min(Math.max(value, Math.min(a, b)), Math.max(a, b));
		const pad = PAN_EDGE_PADDING;
		const x = clamp(t.x, width - t.k * width - pad, pad);
		const y = clamp(t.y, height - t.k * height - pad, offsetY + pad);
		return x === t.x && y === t.y ? t : zoomIdentity.translate(x, y).scale(t.k);
	};

	// The full, unzoomed view, shifted down by offsetY.
	const homeTransform = $derived(zoomIdentity.translate(0, offsetY));

	// Each outlined song's eased playing emphasis, from 0 (not playing) to 1
	// (playing), and how far the rest are faded, from 0 (nothing playing) to
	// 1. Tweened toward playingSongKey by the effect below, which redraws
	// each frame itself, so these aren't reactive.
	let playingEmphasis = new Map<string, number>();
	let playingFade = 0;

	const emphasisFor = (songKey: string): number =>
		playingEmphasis.get(songKey) ?? 0;

	const lerp = (from: number, to: number, t: number): number =>
		from + (to - from) * t;

	const radiusFor = (songKey: string): number => {
		if (isOutlined(songKey)) {
			return lerp(
				OUTLINED_POINT_RADIUS,
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

	// alphaFor, faded further when another outlined song is playing.
	const outlinedAlphaFor = (songKey: string): number =>
		alphaFor(songKey) *
		lerp(1, NOT_PLAYING_ALPHA, playingFade * (1 - emphasisFor(songKey)));

	// outlinedSongKeys, most emphasized last, so the playing song (and one
	// shrinking back) draws on top.
	const outlinedInDrawOrder = (): string[] =>
		outlinedSongKeys
			? [...outlinedSongKeys].sort((a, b) => emphasisFor(a) - emphasisFor(b))
			: [];

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

			if (hoveredClusterHit?.cluster.hash === cluster.hash) {
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
			if (isOutlined(point.songKey)) continue;
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
			context.globalAlpha = alphaFor(point.songKey);
			context.fillStyle =
				emphasisFillColor && emphasizedSongKeys?.has(point.songKey)
					? emphasisFillColor
					: hexMode
						? songRegionFill(point.songKey, dotGradient)
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

	// outlinedSongKeys: a white glow, then the song's region color inside a
	// white ring, so they stand out from the dots around them.
	const drawOutlinedSongs = (
		context: CanvasRenderingContext2D,
		gradientStrength: number
	) => {
		for (const songKey of outlinedInDrawOrder()) {
			const position = displayedPositions.get(songKey);
			if (!position) continue;
			const screen = toScreen(position);
			const radius = radiusFor(songKey);
			const glowBlur = lerp(
				OUTLINE_GLOW_BLUR,
				PLAYING_GLOW_BLUR,
				emphasisFor(songKey)
			);
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
			context.arc(screen.x, screen.y, radius - OUTLINE_WIDTH, 0, Math.PI * 2);
			context.fillStyle = hexMode
				? songRegionFill(songKey, gradientStrength)
				: OUTLINE_COLOR;
			context.fill();
		}
	};

	type Box = { left: number; right: number; top: number; bottom: number };

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
		if (!outlinedSongKeys || !songSummaryByKey) return;
		const songs = outlinedInDrawOrder()
			.reverse()
			.flatMap((songKey) => {
				const summary = songSummaryByKey.get(songKey);
				const position = displayedPositions.get(songKey);
				if (!summary || !position) return [];
				const screen = toScreen(position);
				const radius = radiusFor(songKey);
				const lines: [string, string][] = [
					[OUTLINED_LABEL_TITLE_FONT, summary.title]
				];
				if (summary.artists.length > 0) {
					lines.push([OUTLINED_LABEL_ARTIST_FONT, summary.artists.join(", ")]);
				}
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
		const labels: { songKey: string; lines: [string, string][]; box: Box }[] =
			[];
		for (const { songKey, screen, radius, lines } of onScreen) {
			const textWidth = Math.max(
				...lines.map(([font, text]) => {
					context.font = font;
					return context.measureText(text).width;
				})
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
			context.globalAlpha = outlinedAlphaFor(songKey);
			const x = box.left + OUTLINED_LABEL_PADDING;
			lines.forEach(([font, text], index) => {
				const y =
					box.top +
					OUTLINED_LABEL_PADDING +
					(index + 0.5) * OUTLINED_LABEL_LINE_HEIGHT;
				context.font = font;
				context.strokeText(text, x, y);
				context.fillText(text, x, y);
			});
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
			plotWidth,
			plotHeight,
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
						: regionFill(region.name, share, gradient)
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
				nx: (region.x - PLOT_MARGIN) / Math.max(plotWidth, 1),
				ny: 1 - (region.y - PLOT_MARGIN) / Math.max(plotHeight, 1)
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
			return;
		}
		hoveredHex = null;
		const songKey = findPointAtAnchor(anchor);
		hoveredSongKey = songKey;
		delayedTooltip.setHover(songKey, songKey === null ? null : anchor);
		hoveredClusterHit = songKey === null ? findClusterAt(anchor) : null;
	};

	// Pressing C while a simple song tooltip is up shows or hides its full
	// chords; each newly hovered song starts with them hidden.
	let tooltipChordsExpanded = $state(false);

	$effect(() => {
		void delayedTooltip.tooltipSongKey;
		tooltipChordsExpanded = false;
	});

	const handleWindowKeydown = (event: KeyboardEvent) => {
		if (!simpleSongTooltip || delayedTooltip.tooltipSongKey === null) return;
		if (event.key !== "c" && event.key !== "C") return;
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		const target = event.target;
		if (
			target instanceof HTMLElement &&
			(target.isContentEditable ||
				["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
		) {
			return;
		}
		tooltipChordsExpanded = !tooltipChordsExpanded;
	};

	const handlePointerLeave = () => {
		hoveredHex = null;
		hoveredSongKey = null;
		delayedTooltip.clearHover();
		hoveredClusterHit = null;
	};

	const handleClick = (event: MouseEvent) => {
		if (clickGuard.shouldSuppressClick()) return;
		if (!containerEl) return;
		onOutlinedSongClick?.(
			findOutlinedSongAtAnchor(anchorFromMouseEvent(event, containerEl))
		);
		if (hexFrame) {
			// Clicking a hex zooms in on it, toward finer hexes and then dots.
			const anchor = anchorFromMouseEvent(event, containerEl);
			if (
				movable &&
				canvasEl &&
				zoomBehavior &&
				hexKeyAtAnchor(anchor) !== null
			) {
				select(canvasEl)
					.transition()
					.duration(HEX_CLICK_ZOOM_MS)
					.call(zoomBehavior.scaleBy, HEX_CLICK_ZOOM_FACTOR, [
						anchor.x,
						anchor.y
					]);
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

	// Eases playingEmphasis and playingFade toward playingSongKey, from
	// wherever they are (mid-tween included), redrawing each frame.
	$effect(() => {
		const target = playingSongKey;
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
				// Hexes re-bin as the zoom changes, so a hovered hex is stale.
				hoveredHex = null;
			});
		select(canvas).call(zoomBehavior);
		return () => {
			select(canvas).on(".zoom", null);
			zoomBehavior = null;
		};
	});

	// Fits a cluster's current member bounds to the viewport (with padding),
	// for focusClusterName below. Returns null if none of its songs have a
	// known position yet.
	const clusterFocusTransform = (
		clusterSongKeys: readonly string[]
	): ZoomTransform | null => {
		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;
		for (const songKey of clusterSongKeys) {
			const point = pointBySongKey.get(songKey);
			if (!point) continue;
			const { x: rawX, y: rawY } = toBasePixel(point);
			minX = Math.min(minX, rawX);
			maxX = Math.max(maxX, rawX);
			minY = Math.min(minY, rawY);
			maxY = Math.max(maxY, rawY);
		}
		if (!isFinite(minX)) return null;

		const boxWidth = Math.max(maxX - minX, 1);
		const boxHeight = Math.max(maxY - minY, 1);
		if (hexMode && focusFrame && focusFrame.height > 0) {
			// Capped by width too, so a wide cluster doesn't spill off the sides.
			// Never below dot zoom, so a big cluster still shows as dots even if
			// it then overflows the frame.
			const frameScale = Math.min(
				Math.max(
					Math.min(
						(focusFrame.height * FRAME_FOCUS_FILL) / boxHeight,
						(width * FRAME_FOCUS_FILL) / boxWidth
					),
					HEX_FOCUS_SCALE
				),
				MAX_ZOOM
			);
			const centerX = (minX + maxX) / 2;
			const centerY = (minY + maxY) / 2;
			return zoomIdentity
				.translate(
					width / 2 - centerX * frameScale,
					focusFrame.top + focusFrame.height / 2 - centerY * frameScale
				)
				.scale(frameScale);
		}
		const fitScale = Math.min(
			(width * CLUSTER_FOCUS_PADDING) / boxWidth,
			(height * CLUSTER_FOCUS_PADDING) / boxHeight
		);
		const scale = hexMode
			? HEX_FOCUS_SCALE
			: Math.min(Math.max(fitScale, MIN_ZOOM), MAX_CLUSTER_FOCUS_SCALE);
		return transformCenteredOn(
			{ x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
			scale
		);
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
				const target = normalizeName(focusClusterName);
				const cluster = clusters
					.filter((candidate) => {
						const name = resolvedClusterNames.get(candidate.hash);
						return name !== undefined && normalizeName(name) === target;
					})
					.sort((a, b) => b.songKeys.length - a.songKeys.length)[0];
				return cluster ? clusterFocusTransform(cluster.songKeys) : null;
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
			select(canvas).call(zoomBehavior.transform, targetTransform);
			return;
		}
		select(canvas)
			.transition()
			.duration(FOCUS_TRANSITION_MS)
			.call(zoomBehavior.transform, targetTransform);
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
			select(canvas).call(zoomBehavior.transform, target);
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

<svelte:window onkeydown={handleWindowKeydown} />

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
		class:grabbable={movable && !hoverable}
		class:clickable={hoveredSongKey !== null && isOutlined(hoveredSongKey)}
		style:width="{width}px"
		style:height="{height}px"
	></canvas>

	{#if hoveredHex}
		{@const { region } = hoveredHex}
		{@const songCount = clusterSizeByHash.get(region.id) ?? 0}
		{@const chords = region.progressionNames
			.map((name) => chordsByProgressionName.get(name))
			.filter((chord) => chord !== undefined)
			.join(" · ")}
		<div class="tooltip" style={hoverCardStyle(hoveredHex.anchor, width)}>
			<div class="hex-tooltip-title">
				<span
					class="hex-tooltip-swatch"
					style:background={regionColorByName.get(region.name) ??
						hexColors.unmatched}
				></span>
				{region.name}
			</div>
			{#if chords}
				<div class="hex-tooltip-chords">{chords}</div>
			{/if}
			<div class="hex-tooltip-meta">
				{songCount}
				{songCount === 1 ? "song" : "songs"}{movable
					? " · click to zoom in"
					: ""}
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
					expanded={tooltipChordsExpanded}
				/>
			</div>
		{:else if tooltipSong}
			<div class="tooltip" style={tooltipStyle}>
				<SongTooltip song={tooltipSong} />
			</div>
		{:else if simpleSongTooltip && tooltipSummary}
			<div class="tooltip" style={tooltipStyle}>
				<div class="hex-tooltip-title">{tooltipSummary.title}</div>
				<div class="hex-tooltip-meta">{tooltipSummary.artists.join(", ")}</div>
			</div>
		{:else if tooltipSummary}
			<div class="tooltip" style={tooltipStyle}>
				<div class="hex-tooltip-title">{tooltipSummary.title}</div>
				<div class="hex-tooltip-meta">{tooltipSummary.artists.join(", ")}</div>
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
		cursor: crosshair;
	}

	canvas.grabbable {
		cursor: grab;
	}

	canvas.clickable {
		cursor: pointer;
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
		gap: 0.375rem;
		font-weight: 600;
		margin-bottom: 0.125rem;
	}

	.hex-tooltip-chords {
		color: #d4d4d8;
		font-size: 0.7rem;
		margin-bottom: 0.25rem;
	}

	.hex-tooltip-meta {
		color: #a1a1aa;
		font-size: 0.65rem;
	}

	.hex-tooltip-swatch {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 0.125rem;
		flex-shrink: 0;
	}
</style>
