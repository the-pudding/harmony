<script lang="ts">
	import { onDestroy, untrack } from "svelte";
	import {
		easeCubicInOut,
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
	import { SCATTER_DIMMED_ALPHA, SCATTER_NORMAL_ALPHA } from "./scatterPoint.js";
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
		// Color dots by their progression-family blend. Defaults to true
		// (existing behavior) so normal interactive use is unaffected; /story
		// passes false by default so a highlighted song/family stands out
		// starkly against a plain starfield instead of competing with color.
		showFamilyColors?: boolean;
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
	};

	const {
		points,
		songByKey,
		selectedSongKey,
		coClusterSongKeys,
		highlightedSongKeys,
		visibleSongKeys = null,
		axisLabels = null,
		method,
		clusters,
		emphasizedClusterHashes,
		onSelect,
		focusSongKey = undefined,
		focusScale = DEFAULT_FOCUS_SCALE,
		focusClusterName = undefined,
		emphasizedSongKeys = null,
		showFamilyColors = true,
		showClusterOutlines = true,
		familyEmphasisSongKeys = null
	}: Props = $props();

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
	// Used instead of the group-share color blend when showFamilyColors is
	// false — a plain, star-like white so a highlighted song/family reads
	// clearly against an otherwise uncolored field.
	const STAR_FILL_COLOR = "#e4e4e7";

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

	const resolvedClusterNames = $derived(
		resolveClusterNames(clusters, getNamedClusters())
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

	const alphaFor = (songKey: string): number => {
		if (hoveredSongKey === songKey || highlightedSongKeys.has(songKey)) return 1;
		if (emphasizedSongKeys) {
			return emphasizedSongKeys.has(songKey) ? 1 : SCATTER_DIMMED_ALPHA;
		}
		if (selectedSongKey === null) return SCATTER_NORMAL_ALPHA;
		if (songKey === selectedSongKey || coClusterSongKeys.has(songKey)) return 1;
		return SCATTER_DIMMED_ALPHA;
	};

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

			context.globalAlpha = 1;
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
		drawClusters(context);

		for (const point of drawablePoints) {
			const position = displayedPositions.get(point.songKey);
			if (!position) continue;
			const screen = toScreen(position);
			context.globalAlpha = alphaFor(point.songKey);
			context.fillStyle = showFamilyColors
				? fillStyleForGroupShares(context, screen.x, screen.y, point.groupShares)
				: STAR_FILL_COLOR;
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
		const songKey = findPointAtAnchor(anchor);
		hoveredSongKey = songKey;
		delayedTooltip.setHover(songKey, songKey === null ? null : anchor);
		hoveredClusterHit = songKey === null ? findClusterAt(anchor) : null;
	};

	const handlePointerLeave = () => {
		hoveredSongKey = null;
		delayedTooltip.clearHover();
		hoveredClusterHit = null;
	};

	const handleClick = (event: MouseEvent) => {
		if (clickGuard.shouldSuppressClick()) return;
		if (!containerEl) return;
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
		void showFamilyColors;
		void showClusterOutlines;
		void familyEmphasisSongKeys;
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

</style>
