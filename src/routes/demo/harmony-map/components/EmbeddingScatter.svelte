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
	import {
		findNamedClusterFor,
		getNamedClusters,
		resolveClusterNames,
		setClusterName
	} from "./namedClusters.svelte.js";

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
		onSelect
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
	const CLUSTER_DASH_PATTERN = [7, 5];
	const CLUSTER_LABEL_COLOR = "rgba(244, 244, 245, 0.9)";
	const CLUSTER_LABEL_FONT = '10px "JetBrains Mono", ui-monospace, monospace';
	const CLUSTER_NAME_FONT =
		'600 11px "JetBrains Mono", ui-monospace, monospace';
	const CLUSTER_NAME_COLOR = "#f4f4f5";
	const CLUSTER_LABEL_GAP = 6;

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
	type NamingInputState = {
		cluster: DensityCluster;
		anchorSongKey: string | null;
		x: number;
		y: number;
		initialName: string;
	};

	let hoveredClusterHit = $state<ClusterHit | null>(null);
	let namingInput = $state<NamingInputState | null>(null);
	let namingInputEl = $state<HTMLInputElement | null>(null);

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

			const name = resolvedClusterNames.get(cluster.hash);
			const strokeAlpha = clusterAnnotationAlpha(
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
			context.fillStyle = fillStyleForGroupShares(
				context,
				screen.x,
				screen.y,
				point.groupShares
			);
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

	// A cluster's anchor is a highlighted song within it — a deliberate,
	// human choice of which song identifies the cluster, unlike a geometric
	// guess that could quietly pick a different member on every re-run. Ties
	// (multiple highlighted members) just take whichever comes first;
	// nothing distinguishes them.
	const highlightedAnchorFor = (cluster: DensityCluster): string | null =>
		cluster.songKeys.find((songKey) => highlightedSongKeys.has(songKey)) ??
		null;

	const openNamingInput = (hit: ClusterHit) => {
		const existing = findNamedClusterFor(hit.cluster, getNamedClusters());
		// A highlighted member always wins, so renaming after re-highlighting
		// swaps the anchor to it — setClusterName dedupes by name, so that
		// swap replaces the existing entry instead of adding a second one.
		// With nothing highlighted, fall back to the existing anchor (if any)
		// so you can still edit or clear an already-named cluster; a brand
		// new cluster with nothing highlighted has no anchor to offer yet.
		const anchorSongKey =
			highlightedAnchorFor(hit.cluster) ?? existing?.anchorSongKey ?? null;
		namingInput = {
			cluster: hit.cluster,
			anchorSongKey,
			x: hit.geometry.centroid.x,
			y: Math.max(
				24,
				hit.geometry.centroid.y -
					clusterEllipseBoundingRadius(hit.geometry) -
					CLUSTER_LABEL_GAP
			),
			initialName: existing?.name ?? ""
		};
	};

	const commitNamingInput = () => {
		if (!namingInput) return;
		if (namingInput.anchorSongKey) {
			const name = namingInputEl?.value.trim() ?? "";
			setClusterName(namingInput.anchorSongKey, name);
			// This only updates the live session (see namedClusters.svelte.ts) —
			// log a paste-ready entry so it can be landed in
			// src/data/named-clusters.ts to persist for everyone.
			if (name) {
				console.info(
					`Cluster named — add to src/data/named-clusters.ts to persist:\n{ anchorSongKey: ${JSON.stringify(namingInput.anchorSongKey)}, name: ${JSON.stringify(name)} }`
				);
			}
		}
		namingInput = null;
	};

	const handleNamingKeydown = (event: KeyboardEvent) => {
		event.stopPropagation();
		if (event.key === "Enter") {
			event.preventDefault();
			commitNamingInput();
		} else if (event.key === "Escape") {
			event.preventDefault();
			namingInput = null;
		}
	};

	const handleClick = (event: MouseEvent) => {
		if (clickGuard.shouldSuppressClick()) return;
		if (!containerEl) return;
		// The "highlight a song first" hint has no input to blur, so it has to
		// be cleared explicitly before handling whatever this click does next.
		if (namingInput && namingInput.anchorSongKey === null) namingInput = null;
		const anchor = anchorFromMouseEvent(event, containerEl);
		const songKey = findPointAt(event);
		if (songKey !== null) {
			onSelect(songKey === selectedSongKey ? null : songKey);
			return;
		}
		const clusterHit = findClusterAt(anchor);
		if (clusterHit !== null) {
			openNamingInput(clusterHit);
			return;
		}
		onSelect(null);
	};

	$effect(() => {
		if (namingInput && namingInput.anchorSongKey !== null && namingInputEl) {
			namingInputEl.focus();
			namingInputEl.select();
		}
	});

	$effect(() => {
		if (!clustersAvailable) {
			namingInput = null;
			hoveredClusterHit = null;
		}
	});

	$effect(() => {
		const targets = normalizedPoints;
		untrack(() => tweenTo(targets));
		return () => cancelAnimationFrame(tweenFrame);
	});

	$effect(() => {
		const canvas = canvasEl;
		if (!canvas) return;
		const zoomBehavior = zoom<HTMLCanvasElement, unknown>()
			.scaleExtent([MIN_ZOOM, MAX_ZOOM])
			.on("start", () => {
				delayedTooltip.startDrag();
			})
			.on("end", delayedTooltip.endDrag)
			.on("zoom", (event) => {
				transform = event.transform;
			});
		select(canvas).call(zoomBehavior);
		return () => select(canvas).on(".zoom", null);
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
	class:cluster-hover={hoveredClusterHit !== null}
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

	{#if namingInput}
		{#if namingInput.anchorSongKey === null}
			<div
				class="cluster-name-hint"
				style:left="{namingInput.x}px"
				style:top="{namingInput.y}px"
			>
				highlight a song in this cluster first
			</div>
		{:else}
			<input
				class="cluster-name-input"
				style:left="{namingInput.x}px"
				style:top="{namingInput.y}px"
				value={namingInput.initialName}
				placeholder="name this cluster…"
				title="Preview only for this session — see console for a snippet to add to src/data/named-clusters.ts"
				aria-label="Cluster name"
				bind:this={namingInputEl}
				onclick={(event) => event.stopPropagation()}
				onkeydown={handleNamingKeydown}
				onblur={commitNamingInput}
			/>
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

	.scatter.cluster-hover canvas {
		cursor: text;
	}

	.cluster-name-input {
		position: absolute;
		transform: translate(-50%, -100%);
		font-family: inherit;
		font-size: 0.7rem;
		font-weight: 600;
		color: #f4f4f5;
		background: rgba(9, 9, 11, 0.96);
		border: 1px solid rgba(99, 102, 241, 0.6);
		border-radius: 0.25rem;
		padding: 0.2rem 0.4rem;
		width: 10rem;
		text-align: center;
		z-index: 20;
	}

	.cluster-name-input:focus {
		outline: none;
		border-color: rgba(129, 140, 248, 0.9);
	}

	.cluster-name-hint {
		position: absolute;
		transform: translate(-50%, -100%);
		font-family: inherit;
		font-size: 0.65rem;
		font-weight: 500;
		font-style: italic;
		color: #a1a1aa;
		background: rgba(9, 9, 11, 0.96);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.25rem;
		padding: 0.2rem 0.4rem;
		width: 11rem;
		text-align: center;
		z-index: 20;
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

</style>
