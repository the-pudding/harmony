<script lang="ts">
	import { onDestroy, untrack } from "svelte";
	import {
		easeCubicInOut,
		interpolateLab,
		select,
		zoom,
		zoomIdentity,
		type ZoomTransform
	} from "d3";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import {
		type DensityCluster
	} from "../embedding/clustering/densityClusters.js";
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
		HIGHLIGHT_LABEL_COLOR,
		HIGHLIGHT_LABEL_FONT,
		HIGHLIGHT_LABEL_GAP_PX,
		HIGHLIGHT_LABEL_MAX_WIDTH_PX,
		HIGHLIGHT_RING_COLOR,
		HIGHLIGHT_RING_OFFSET_PX,
		HIGHLIGHT_RING_WIDTH_PX,
		truncateLabelToWidth
	} from "./highlightSongMarker.js";
	import { getNamedClusters, resolveClusterNames } from "./namedClusters.js";
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
		summarizeHex,
		type ClusterRegion,
		type HexBin,
		type HexSummary,
		type ProgressionShare
	} from "../embedding/layout/hexBins.js";

	const DEFAULT_FOCUS_SCALE = 8;
	const FOCUS_TRANSITION_MS = 900;
	// When focusing a whole cluster, its bounding box is scaled to fill this
	// fraction of the viewport's smaller dimension, so there's breathing room
	// around the edge rather than the outermost points touching it.
	const CLUSTER_FOCUS_PADDING = 0.65;
	const MAX_CLUSTER_FOCUS_SCALE = 24;

	type Props = {
		points: ScatterPoint[];
		songByKey: Map<string, GroupedSong>;
		selectedSongKey: string | null;
		coClusterSongKeys: Set<string>;
		highlightedSongKeys: Set<string>;
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
		// "hex" groups songs into hexagons whose size follows the zoom: big
		// when zoomed out, smaller as you zoom in, plain dots near max zoom.
		// Each hex takes the color of its main progression, faded when the
		// hex is only partly that progression. Needs progressionSharesBySongKey.
		renderMode?: "dots" | "hex";
		// Each song's progressions with their share of its matched chords.
		progressionSharesBySongKey?: ReadonlyMap<
			string,
			readonly ProgressionShare[]
		> | null;
		// The cluster each song belongs to, for clusters with a clear main
		// progression. Hex mode colors by cluster: songs missing from this
		// map, and hexes no single cluster holds half of, are drawn gray.
		clusterRegionBySongKey?: ReadonlyMap<string, ClusterRegion> | null;
		// Outline labels by cluster hash. When omitted, names come from the
		// named-clusters file.
		clusterNames?: ReadonlyMap<string, string> | null;
	};

	const {
		points,
		songByKey,
		selectedSongKey,
		coClusterSongKeys,
		highlightedSongKeys,
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
		emphasizedSongKeys = null,
		colorMode = "groups",
		showClusterOutlines = true,
		familyEmphasisSongKeys = null,
		emphasisFillColor = null,
		accentSongKeys = null,
		accentFillColor = null,
		renderMode = "dots",
		progressionSharesBySongKey = null,
		clusterRegionBySongKey = null,
		clusterNames = null
	}: Props = $props();

	// Hex mode: hex radius on screen at zoom 1, the zoom where hexes give way
	// to dots, and how gently hexes shrink on screen as you zoom in (they go
	// from 7px at 1× to about 5px just before dots take over).
	const HEX_ZOOM = {
		baseScreenRadius: 7,
		dotsAtZoom: 4,
		shrinkExponent: 0.25
	} as const;
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
	// What a hex fades toward when it's only partly its main progression,
	// and the fill for songs or hexes with no matched progression.
	const FADED_REGION_COLOR = "#2a2a2e";
	const UNMATCHED_REGION_COLOR = "#27272a";
	// Faintest a hex can get, so even a mixed hex keeps a hint of its hue.
	const MIN_REGION_TINT = 0.2;
	// Hexes are drawn slightly oversized so neighbors overlap and touch with
	// no seams or gaps between them.
	const HEX_OVERLAP_PX = 0.5;
	// Hexes and songs that don't belong to a clearly defined cluster.
	const AMBIGUOUS_REGION_COLOR = "#3f3f46";
	// A hex takes a cluster's color only when that cluster holds at least
	// this share of its songs; otherwise it's unclustered or split, and gray.
	const MIN_CLUSTER_SHARE_OF_HEX = 0.5;
	const HEX_LABEL_FONT = "500 10px 'JetBrains Mono', ui-monospace, monospace";
	// Any colored region this many hexes or larger can be labeled.
	const HEX_LABEL_MIN_HEXES = 1;
	// Empty space kept around each label so neighboring labels don't touch.
	const HEX_LABEL_PADDING_X = 6;
	const HEX_LABEL_PADDING_Y = 6;
	// Nearby clusters often share a progression; skip a label when the same
	// name is already shown within this distance.
	const HEX_LABEL_REPEAT_DISTANCE_PX = 150;
	const HEX_CLICK_ZOOM_FACTOR = 2.5;
	const HEX_CLICK_ZOOM_MS = 450;

	// Density clustering is only meaningful over layouts UMAP actually produced
	// (see UMAP_DRIVEN_METHODS) — PCA/feature-axis positions are linear
	// projections or hand-designed axes where geometric proximity doesn't mean
	// "similar songs", so DBSCAN circles there would be visually plausible but
	// semantically noise.
	const CLUSTERABLE_METHODS = new Set<EmbeddingMethod>(UMAP_DRIVEN_METHODS);

	const PLOT_MARGIN = 32;
	const POINT_RADIUS = 3;
	const SELECTED_POINT_RADIUS = 6;
	const HOVER_PICK_RADIUS = 12;
	const RING_WIDTH = 1.5;
	const TWEEN_DURATION_MS = 700;
	const JITTER_AMPLITUDE = 0.004;
	const MIN_ZOOM = 1;
	const MAX_ZOOM = 40;
	const AXIS_LABEL_COLOR = "rgba(161, 161, 170, 0.7)";
	const AXIS_LABEL_FONT = '10px "JetBrains Mono", ui-monospace, monospace';
	const CLUSTER_RADIUS_PADDING = 8;
	const CLUSTER_STROKE_COLOR = "#e4e4e7";
	const CLUSTER_STROKE_WIDTH = 2;
	const CLUSTER_UNNAMED_STROKE_ALPHA = 0.72;
	// A cluster "heavily involves" a highlighted family when at least this
	// fraction of its songs are in familyEmphasisSongKeys; below that its
	// outline fades to CLUSTER_DEEMPHASIZED_STROKE_ALPHA and its name hides.
	const FAMILY_INVOLVEMENT_THRESHOLD = 0.5;
	const CLUSTER_DEEMPHASIZED_STROKE_ALPHA = 0.15;
	const CLUSTER_DASH_PATTERN = [7, 5];
	const CLUSTER_LABEL_COLOR = "rgba(244, 244, 245, 0.9)";
	const CLUSTER_LABEL_FONT = '10px "JetBrains Mono", ui-monospace, monospace';
	const CLUSTER_NAME_FONT =
		'600 11px "JetBrains Mono", ui-monospace, monospace';
	const CLUSTER_NAME_COLOR = "#f4f4f5";
	const CLUSTER_LABEL_GAP = 6;
	// Used when colorMode is "off" — a plain, star-like white so a
	// highlighted song/family reads clearly against an otherwise uncolored
	// field.
	const STAR_FILL_COLOR = "#e4e4e7";

	const baseFillFor = (
		context: CanvasRenderingContext2D,
		screen: { x: number; y: number },
		point: ScatterPoint
	): string | CanvasGradient => {
		if (colorMode === "groups") {
			return fillStyleForGroupShares(context, screen.x, screen.y, point.groupShares);
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

	// The hex under the pointer in hex mode, plus the bins and summaries from
	// the last frame so hover can look them up without re-binning.
	let hoveredHex = $state<{ key: string; anchor: HoverCardAnchor } | null>(
		null
	);
	let hexFrame: {
		radius: number;
		bins: Map<string, HexBin>;
		summaries: Map<string, HexSummary>;
		ambiguousKeys: Set<string>;
		regionByKey: Map<string, ClusterRegion | null>;
	} | null = null;
	let hoveredHexRegion = $state<ClusterRegion | null>(null);
	let hoveredHexSummary = $state<HexSummary | null>(null);
	let hoveredHexIsAmbiguous = $state(false);

	const resolvedClusterNames = $derived(
		clusterNames ?? resolveClusterNames(clusters, getNamedClusters())
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
		renderMode === "hex" && progressionSharesBySongKey !== null
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
	// FADED_REGION_COLOR. gradientStrength scales how much fading is applied,
	// so zoomed-out hexes read as solid regions.
	const regionFill = (
		name: string | null,
		share: number,
		gradientStrength: number
	): string => {
		const color = name === null ? null : regionColorByName.get(name);
		if (!color) return UNMATCHED_REGION_COLOR;
		const strength = 1 - gradientStrength * (1 - Math.min(1, Math.max(0, share)));
		// Lab, not HCL: blending toward a near-gray in HCL rotates the hue
		// (red drifts to magenta), which makes one cluster look multicolored.
		return interpolateLab(FADED_REGION_COLOR, color)(
			MIN_REGION_TINT + (1 - MIN_REGION_TINT) * strength
		);
	};

	// A song's color at dot zoom: its cluster's color, faded by how much of
	// the song is that cluster's progression; gray outside clear clusters.
	const songRegionFill = (songKey: string, gradientStrength: number): string => {
		const region = clusterRegionBySongKey?.get(songKey);
		if (!region) return AMBIGUOUS_REGION_COLOR;
		return regionFill(
			region.name,
			averageProgressionShare(
				[songKey],
				region.name,
				progressionSharesBySongKey ?? new Map()
			),
			gradientStrength
		);
	};

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

	const toScreen = (position: Position): { x: number; y: number } => ({
		x: transform.applyX(PLOT_MARGIN + position.nx * plotWidth),
		y: transform.applyY(PLOT_MARGIN + (1 - position.ny) * plotHeight)
	});

	const radiusFor = (songKey: string): number => {
		if (songKey === selectedSongKey) return SELECTED_POINT_RADIUS;
		return POINT_RADIUS;
	};

	const alphaFor = (songKey: string): number =>
		scatterPointAlpha({
			songKey,
			hoveredSongKey,
			selectedSongKey,
			coClusterSongKeys,
			highlightedSongKeys,
			emphasizedSongKeys,
			inYearSongKeys
		});

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
				cluster.songKeys.filter((songKey) => familyEmphasisSongKeys.has(songKey))
					.length /
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

			if (name) {
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

	const drawHighlightedSongs = (context: CanvasRenderingContext2D) => {
		if (highlightedSongKeys.size === 0) return;

		context.font = HIGHLIGHT_LABEL_FONT;
		context.textAlign = "center";
		context.textBaseline = "alphabetic";

		for (const songKey of highlightedSongKeys) {
			if (!pointBySongKey.has(songKey)) continue;
			const position = displayedPositions.get(songKey);
			if (!position) continue;
			const screen = toScreen(position);
			const radius = radiusFor(songKey);

			context.globalAlpha = alphaFor(songKey);
			context.strokeStyle = HIGHLIGHT_RING_COLOR;
			context.lineWidth = HIGHLIGHT_RING_WIDTH_PX;
			context.beginPath();
			context.arc(
				screen.x,
				screen.y,
				radius + HIGHLIGHT_RING_OFFSET_PX,
				0,
				Math.PI * 2
			);
			context.stroke();

			const title = songByKey.get(songKey)?.title ?? songKey;
			const label = truncateLabelToWidth(
				context,
				title,
				HIGHLIGHT_LABEL_MAX_WIDTH_PX
			);
			context.fillStyle = HIGHLIGHT_LABEL_COLOR;
			context.fillText(
				label,
				screen.x,
				screen.y -
					radius -
					HIGHLIGHT_RING_OFFSET_PX -
					HIGHLIGHT_LABEL_GAP_PX
			);
		}
	};

	const draw = () => {
		const canvas = canvasEl;
		const context = canvas?.getContext("2d");
		if (!canvas || !context || width === 0 || height === 0) return;

		const pixelRatio = window.devicePixelRatio || 1;
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
		const dotGradient = hexMode
			? gradientStrengthForZoom(transform.k, HEX_ZOOM)
			: 0;

		drawClusters(context);

		for (const point of pointsInDrawOrder) {
			const position = displayedPositions.get(point.songKey);
			if (!position) continue;
			const screen = toScreen(position);
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

		drawHighlightedSongs(context);

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

	// Bins this frame's positions in base (unzoomed) pixels, so the hex grid
	// stays fixed to the map while panning, then draws it through the zoom.
	const drawHexes = (context: CanvasRenderingContext2D, radius: number) => {
		const basePoints = drawablePoints.flatMap((point) => {
			const position = displayedPositions.get(point.songKey);
			if (!position) return [];
			return [
				{
					songKey: point.songKey,
					x: PLOT_MARGIN + position.nx * plotWidth,
					y: PLOT_MARGIN + (1 - position.ny) * plotHeight
				}
			];
		});
		const bins = binIntoHexes(basePoints, radius);
		const summaries = new Map(
			[...bins].map(([key, bin]) => [
				key,
				summarizeHex(bin.songKeys, progressionSharesBySongKey ?? new Map())
			])
		);
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
		const ambiguousKeys = new Set(
			[...regionByKey].filter(([, region]) => region === null).map(([key]) => key)
		);
		hexFrame = { radius, bins, summaries, ambiguousKeys, regionByKey };

		const screenRadius = radius * transform.k;
		const gradient = gradientStrengthForZoom(transform.k, HEX_ZOOM);
		const drawRadius = screenRadius + HEX_OVERLAP_PX;
		context.globalAlpha = 1;

		// Gray first, so colored hexes sit cleanly on top of the merged gray.
		const drawOrder = [...bins].sort(
			([first], [second]) =>
				Number(ambiguousKeys.has(second)) - Number(ambiguousKeys.has(first))
		);
		for (const [key, bin] of drawOrder) {
			const centerX = transform.applyX(bin.x);
			const centerY = transform.applyY(bin.y);
			if (
				centerX < -screenRadius ||
				centerY < -screenRadius ||
				centerX > width + screenRadius ||
				centerY > height + screenRadius
			) {
				continue;
			}
			const region = regionByKey.get(key) ?? null;
			traceHex(context, centerX, centerY, drawRadius);
			context.fillStyle =
				region === null
					? AMBIGUOUS_REGION_COLOR
					: regionFill(
							region.name,
							averageProgressionShare(
								bin.songKeys,
								region.name,
								progressionSharesBySongKey ?? new Map()
							),
							gradient
						);
			context.fill();

			const isSelected =
				selectedSongKey !== null && bin.songKeys.includes(selectedSongKey);
			if (isSelected || hoveredHex?.key === key) {
				context.strokeStyle = isSelected ? "#f4f4f5" : "#a1a1aa";
				context.lineWidth = isSelected ? 2 : 1.5;
				context.stroke();
			}
		}

		// One label per connected region, biggest first, skipping any that
		// would collide with a label already placed or fall off screen.
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
		// A cluster can break into several patches; label only its biggest
		// (regions come largest first).
		const labeledRegionIds = new Set<string>();
		// Regions are connected hexes of the same cluster, so two clusters on
		// the same progression get separate labels. Gray hexes never do.
		const nameByRegionId = new Map(
			[...regionByKey.values()].flatMap((region) =>
				region === null ? [] : [[region.id, region.name] as const]
			)
		);
		const labelSummaries = new Map(
			[...summaries].map(([key, summary]) => [
				key,
				{ ...summary, dominantName: regionByKey.get(key)?.id ?? null }
			])
		);
		for (const region of findHexRegions(
			bins,
			labelSummaries,
			HEX_LABEL_MIN_HEXES
		)) {
			if (labeledRegionIds.has(region.name)) continue;
			const x = transform.applyX(region.x);
			const y = transform.applyY(region.y);
			const labelText = nameByRegionId.get(region.name) ?? region.name;
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
				left: x - textWidth / 2 - HEX_LABEL_PADDING_X,
				right: x + textWidth / 2 + HEX_LABEL_PADDING_X,
				top: y - HEX_LABEL_PADDING_Y,
				bottom: y + HEX_LABEL_PADDING_Y,
				text: labelText,
				x,
				y
			};
			if (box.left < 0 || box.right > width || box.top < 0 || box.bottom > height) {
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
			labeledRegionIds.add(region.name);
			context.strokeStyle = "#09090b";
			context.lineWidth = 3;
			context.strokeText(labelText, x, y);
			context.fillStyle = "#f4f4f5";
			context.fillText(labelText, x, y);
		}
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
			return !best || clusterHitArea(hit.geometry) < clusterHitArea(best.geometry)
				? hit
				: best;
		}, null);

	const findPointAtAnchor = (anchor: HoverCardAnchor): string | null => {
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
		const anchor = anchorFromMouseEvent(event, containerEl);
		if (hexFrame) {
			const key = hexKeyAtAnchor(anchor);
			hoveredHex = key === null ? null : { key, anchor };
			hoveredHexSummary =
				key === null ? null : (hexFrame.summaries.get(key) ?? null);
			hoveredHexIsAmbiguous =
				key !== null && hexFrame.ambiguousKeys.has(key);
			hoveredHexRegion =
				key === null ? null : (hexFrame.regionByKey.get(key) ?? null);
			hoveredSongKey = null;
			delayedTooltip.clearHover();
			hoveredClusterHit = null;
			return;
		}
		hoveredHex = null;
		hoveredHexSummary = null;
		const songKey = findPointAtAnchor(anchor);
		hoveredSongKey = songKey;
		delayedTooltip.setHover(songKey, songKey === null ? null : anchor);
		hoveredClusterHit = songKey === null ? findClusterAt(anchor) : null;
	};

	const handlePointerLeave = () => {
		hoveredHex = null;
		hoveredHexSummary = null;
		hoveredSongKey = null;
		delayedTooltip.clearHover();
		hoveredClusterHit = null;
	};

	const handleClick = (event: MouseEvent) => {
		if (clickGuard.shouldSuppressClick()) return;
		if (!containerEl) return;
		if (hexFrame) {
			// Clicking a hex zooms in on it, toward finer hexes and then dots.
			const anchor = anchorFromMouseEvent(event, containerEl);
			if (canvasEl && zoomBehavior && hexKeyAtAnchor(anchor) !== null) {
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

	// Hoisted out of the effect below (rather than a local const inside it) so
	// the scripted-zoom effect further down can drive the same behavior
	// programmatically via zoomBehavior.transform.
	let zoomBehavior: ReturnType<typeof zoom<HTMLCanvasElement, unknown>> | null =
		null;

	$effect(() => {
		const canvas = canvasEl;
		if (!canvas) return;
		zoomBehavior = zoom<HTMLCanvasElement, unknown>()
			.scaleExtent([MIN_ZOOM, MAX_ZOOM])
			.on("start", () => {
				delayedTooltip.startDrag();
			})
			.on("end", delayedTooltip.endDrag)
			.on("zoom", (event) => {
				transform = event.transform;
				// Hexes re-bin as the zoom changes, so a hovered hex is stale.
				hoveredHex = null;
				hoveredHexSummary = null;
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
			const rawX = PLOT_MARGIN + point.nx * plotWidth;
			const rawY = PLOT_MARGIN + (1 - point.ny) * plotHeight;
			minX = Math.min(minX, rawX);
			maxX = Math.max(maxX, rawX);
			minY = Math.min(minY, rawY);
			maxY = Math.max(maxY, rawY);
		}
		if (!isFinite(minX)) return null;

		const boxWidth = Math.max(maxX - minX, 1);
		const boxHeight = Math.max(maxY - minY, 1);
		const centerX = (minX + maxX) / 2;
		const centerY = (minY + maxY) / 2;
		const fitScale = Math.min(
			(width * CLUSTER_FOCUS_PADDING) / boxWidth,
			(height * CLUSTER_FOCUS_PADDING) / boxHeight
		);
		const scale = Math.min(Math.max(fitScale, MIN_ZOOM), MAX_CLUSTER_FOCUS_SCALE);
		return zoomIdentity
			.scale(scale)
			.translate(
				width / (2 * scale) - centerX,
				height / (2 * scale) - centerY
			);
	};

	// Scripted zoom (e.g. /story's beats): fully inert when both focusSongKey
	// and focusClusterName are undefined (their prop defaults), so ordinary
	// interactive pages never trigger this. focusClusterName takes priority
	// when both are set. For either: a string animates the view to center on
	// it (fitting the whole cluster, for focusClusterName), null animates
	// back out to the full view.
	$effect(() => {
		if (focusClusterName === undefined && focusSongKey === undefined) return;
		const canvas = canvasEl;
		if (!canvas || !zoomBehavior || width === 0 || height === 0) return;

		const targetTransform = ((): ZoomTransform | null => {
			if (focusClusterName !== undefined) {
				if (focusClusterName === null) return zoomIdentity;
				const cluster = clusters.find(
					(candidate) =>
						resolvedClusterNames.get(candidate.hash) === focusClusterName
				);
				return cluster ? clusterFocusTransform(cluster.songKeys) : null;
			}
			if (focusSongKey === null) return zoomIdentity;
			if (focusSongKey === undefined) return null;
			const point = normalizedPoints.find((p) => p.songKey === focusSongKey);
			if (!point) return null;
			const rawX = PLOT_MARGIN + point.nx * plotWidth;
			const rawY = PLOT_MARGIN + (1 - point.ny) * plotHeight;
			// scale-then-translate composes so the translate offset ends up
			// divided by focusScale — dividing it back out here centers
			// (rawX, rawY) in the viewport at that scale.
			return zoomIdentity
				.scale(focusScale)
				.translate(
					width / (2 * focusScale) - rawX,
					height / (2 * focusScale) - rawY
				);
		})();
		if (!targetTransform) return;

		select(canvas)
			.transition()
			.duration(FOCUS_TRANSITION_MS)
			.call(zoomBehavior.transform, targetTransform);
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
		void highlightedSongKeys;
		void hoveredClusterHit;
		void emphasizedSongKeys;
		void inYearSongKeys;
		void colorMode;
		void showClusterOutlines;
		void familyEmphasisSongKeys;
		void emphasisFillColor;
		void pointsInDrawOrder;
		void accentFillColor;
		void hexMode;
		void regionColorByName;
		void hoveredHex;
		void clusterRegionBySongKey;
		draw();
	});

	const tooltipSong = $derived(
		delayedTooltip.tooltipSongKey === null
			? null
			: (songByKey.get(delayedTooltip.tooltipSongKey) ?? null)
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
	role="button"
	tabindex="0"
	aria-label="Song embedding scatter plot"
	onmousemove={handlePointerMove}
	onpointerdown={(event) => clickGuard.onPointerDown(event)}
	onpointerup={() => clickGuard.onPointerUp()}
	onpointercancel={() => clickGuard.onPointerUp()}
	onmouseleave={handlePointerLeave}
	onclick={handleClick}
	onkeydown={(event) => {
		if (event.key === "Enter" || event.key === " ") {
			if (hoveredSongKey !== null) {
				onSelect(hoveredSongKey === selectedSongKey ? null : hoveredSongKey);
			}
		}
		if (event.key === "Escape") onSelect(null);
	}}
>
	<canvas bind:this={canvasEl} style:width="{width}px" style:height="{height}px"
	></canvas>

	{#if hoveredHex && hoveredHexSummary}
		<div class="tooltip" style={hoverCardStyle(hoveredHex.anchor, width)}>
			<div class="hex-tooltip-title">
				{hoveredHexRegion
					? `${hoveredHexRegion.name} cluster`
					: "no clear cluster"}
			</div>
			<div class="hex-tooltip-meta">
				{hoveredHexSummary.songCount}
				{hoveredHexSummary.songCount === 1 ? "song" : "songs"} · click to zoom in
			</div>
			{#if hoveredHexIsAmbiguous}
				<div class="hex-tooltip-meta">
					gray: not mostly one cluster, or its cluster has no clear main
					progression
				</div>
			{/if}
			<div class="hex-tooltip-meta">progressions in this hex:</div>
			{#each hoveredHexSummary.top as entry (entry.name)}
				<div class="hex-tooltip-row">
					<span
						class="hex-tooltip-swatch"
						style="background: {regionColorByName.get(entry.name) ??
							UNMATCHED_REGION_COLOR};"
					></span>
					<span class="hex-tooltip-name">{entry.name}</span>
					<span class="hex-tooltip-share">{Math.round(entry.share * 100)}%</span>
				</div>
			{/each}
		</div>
	{/if}

	{#if tooltipSong && tooltipVisible && delayedTooltip.tooltipAnchor}
		<div class="tooltip" style={tooltipStyle}>
			<SongTooltip song={tooltipSong} />
		</div>
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

	.hex-tooltip-title {
		font-weight: 600;
		margin-bottom: 0.125rem;
	}

	.hex-tooltip-meta {
		color: #a1a1aa;
		font-size: 0.65rem;
		margin-bottom: 0.375rem;
	}

	.hex-tooltip-row {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.7rem;
		color: #d4d4d8;
	}

	.hex-tooltip-swatch {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 0.125rem;
		flex-shrink: 0;
	}

	.hex-tooltip-name {
		flex: 1;
	}

	.hex-tooltip-share {
		color: #a1a1aa;
		font-variant-numeric: tabular-nums;
	}

</style>
