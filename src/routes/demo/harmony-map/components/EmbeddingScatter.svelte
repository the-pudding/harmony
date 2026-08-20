<script lang="ts">
	import { untrack } from "svelte";
	import {
		easeCubicInOut,
		select,
		zoom,
		zoomIdentity,
		type ZoomTransform
	} from "d3";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import {
		findDensityClusters,
		type DensityCluster
	} from "../embedding/clustering/densityClusters.js";
	import type { EmbeddingMethod } from "../embedding/reducers/types.js";
	import { fillStyleForGroupShares } from "./groupColorBlend.js";
	import SongTooltip from "../../shared/SongTooltip.svelte";
	import {
		anchorFromMouseEvent,
		hoverCardStyle,
		type HoverCardAnchor
	} from "../../shared/hoverCardPosition.js";
	import type { ScatterAxisLabels, ScatterPoint } from "./scatterPoint.js";

	type Props = {
		points: ScatterPoint[];
		songByKey: Map<string, GroupedSong>;
		selectedSongKey: string | null;
		neighborSongKeys: Set<string>;
		highlightedSongKeys: Set<string>;
		visibleSongKeys?: Set<string> | null;
		axisLabels?: ScatterAxisLabels | null;
		method: EmbeddingMethod;
		onSelect: (songKey: string | null) => void;
	};

	const {
		points,
		songByKey,
		selectedSongKey,
		neighborSongKeys,
		highlightedSongKeys,
		visibleSongKeys = null,
		axisLabels = null,
		method,
		onSelect
	}: Props = $props();

	// Density clustering is only meaningful over UMAP's neighbor-preserving
	// layout — PCA/feature-axis/group-blend positions are linear projections or
	// hand-designed axes where geometric proximity doesn't mean "similar songs",
	// so DBSCAN circles there would be visually plausible but semantically noise.
	const CLUSTERABLE_METHOD: EmbeddingMethod = "umap";

	const PLOT_MARGIN = 32;
	const POINT_RADIUS = 3;
	const SELECTED_POINT_RADIUS = 6;
	const NEIGHBOR_POINT_RADIUS = 4.5;
	const HOVER_PICK_RADIUS = 12;
	const DIMMED_ALPHA = 0.18;
	const NORMAL_ALPHA = 0.8;
	const RING_WIDTH = 1.5;
	const TWEEN_DURATION_MS = 700;
	const JITTER_AMPLITUDE = 0.004;
	const MIN_ZOOM = 1;
	const MAX_ZOOM = 40;
	const AXIS_LABEL_COLOR = "rgba(161, 161, 170, 0.7)";
	const AXIS_LABEL_FONT = '10px "JetBrains Mono", ui-monospace, monospace';
	const MAX_DRAWN_CLUSTERS = 60;
	const CLUSTER_RADIUS_PADDING = 8;
	const CLUSTER_STROKE_COLOR = "rgba(244, 244, 245, 0.55)";
	const CLUSTER_STROKE_WIDTH = 1.25;
	const CLUSTER_UNNAMED_STROKE_ALPHA = 0.3;
	const CLUSTER_DASH_PATTERN = [5, 4];
	const CLUSTER_LABEL_COLOR = "rgba(244, 244, 245, 0.75)";
	const CLUSTER_LABEL_FONT = '10px "JetBrains Mono", ui-monospace, monospace';
	const CLUSTER_NAME_FONT =
		'600 11px "JetBrains Mono", ui-monospace, monospace';
	const CLUSTER_NAME_COLOR = "#f4f4f5";
	const CLUSTER_LABEL_GAP = 6;
	const CLUSTER_NAMES_STORAGE_KEY = "harmony-map-cluster-names-v2";
	const HIGHLIGHT_RING_COLOR = "#fbbf24";
	const HIGHLIGHT_RING_WIDTH = 1.25;
	const HIGHLIGHT_RING_OFFSET = 3;
	const HIGHLIGHT_LABEL_COLOR = "#fde68a";
	const HIGHLIGHT_LABEL_FONT = '10px "JetBrains Mono", ui-monospace, monospace';
	const HIGHLIGHT_LABEL_MAX_WIDTH = 90;
	const HIGHLIGHT_LABEL_GAP = 4;

	type NormalizedPoint = ScatterPoint & { nx: number; ny: number };
	type Position = { nx: number; ny: number };

	let containerEl = $state<HTMLDivElement | null>(null);
	let canvasEl = $state<HTMLCanvasElement | null>(null);
	let width = $state(0);
	let height = $state(0);
	let transform = $state<ZoomTransform>(zoomIdentity);
	let hoveredSongKey = $state<string | null>(null);
	let hoverAnchor = $state<HoverCardAnchor | null>(null);
	let showClusters = $state(true);

	type ClusterGeometry = { x: number; y: number; radius: number };
	type ClusterHit = { cluster: DensityCluster; geometry: ClusterGeometry };
	type NamingInputState = {
		cluster: DensityCluster;
		anchorSongKey: string | null;
		x: number;
		y: number;
		initialName: string;
	};

	// A cluster is defined by containing its anchor song, not by its exact
	// membership — so a named cluster survives points drifting in and out
	// (a method switch, an embedding-weight tweak, a corpus edit) as long as
	// the one song it's anchored to is still grouped there. No membership
	// snapshot or drift-healing is needed: matching is just "is this song in
	// the current cluster," checked live every render.
	type NamedCluster = { anchorSongKey: string; name: string };

	let hoveredClusterHit = $state<ClusterHit | null>(null);
	let namingInput = $state<NamingInputState | null>(null);
	let namingInputEl = $state<HTMLInputElement | null>(null);

	const loadNamedClusters = (): NamedCluster[] => {
		if (typeof localStorage === "undefined") return [];
		try {
			const raw = localStorage.getItem(CLUSTER_NAMES_STORAGE_KEY);
			if (!raw) return [];
			const parsed: unknown = JSON.parse(raw);
			return Array.isArray(parsed) ? (parsed as NamedCluster[]) : [];
		} catch {
			return [];
		}
	};

	let namedClusters = $state<NamedCluster[]>(loadNamedClusters());

	const persistNamedClusters = (next: NamedCluster[]) => {
		namedClusters = next;
		if (typeof localStorage !== "undefined") {
			localStorage.setItem(CLUSTER_NAMES_STORAGE_KEY, JSON.stringify(next));
		}
	};

	const findNamedClusterFor = (
		cluster: DensityCluster
	): NamedCluster | null => {
		const memberSet = new Set(cluster.songKeys);
		return (
			namedClusters.find((entry) => memberSet.has(entry.anchorSongKey)) ?? null
		);
	};

	const setClusterName = (anchorSongKey: string, name: string) => {
		const survivors = namedClusters.filter(
			(entry) => entry.anchorSongKey !== anchorSongKey
		);
		persistNamedClusters(
			name ? [...survivors, { anchorSongKey, name }] : survivors
		);
	};

	const resolvedClusterNames = $derived.by((): Map<string, string> => {
		const result = new Map<string, string>();
		for (const cluster of clusters) {
			const match = findNamedClusterFor(cluster);
			if (match) result.set(cluster.hash, match.name);
		}
		return result;
	});

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

	const clustersAvailable = $derived(method === CLUSTERABLE_METHOD);

	// Membership only — geometry is drawn from each frame's live tween
	// positions in drawClusters(), so circles animate along with their dots.
	const clusters = $derived(
		showClusters && clustersAvailable
			? findDensityClusters(
					drawablePoints.map((point) => ({
						songKey: point.songKey,
						x: point.nx,
						y: point.ny
					}))
				).slice(0, MAX_DRAWN_CLUSTERS)
			: []
	);

	const plotWidth = $derived(Math.max(0, width - PLOT_MARGIN * 2));
	const plotHeight = $derived(Math.max(0, height - PLOT_MARGIN * 2));

	const toScreen = (position: Position): { x: number; y: number } => ({
		x: transform.applyX(PLOT_MARGIN + position.nx * plotWidth),
		y: transform.applyY(PLOT_MARGIN + (1 - position.ny) * plotHeight)
	});

	const radiusFor = (songKey: string): number => {
		if (songKey === selectedSongKey) return SELECTED_POINT_RADIUS;
		if (neighborSongKeys.has(songKey)) return NEIGHBOR_POINT_RADIUS;
		return POINT_RADIUS;
	};

	const alphaFor = (songKey: string): number => {
		if (selectedSongKey === null) return NORMAL_ALPHA;
		if (songKey === selectedSongKey || neighborSongKeys.has(songKey)) return 1;
		return DIMMED_ALPHA;
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

			const centroid = screenPositions.reduce(
				(sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }),
				{ x: 0, y: 0 }
			);
			centroid.x /= screenPositions.length;
			centroid.y /= screenPositions.length;
			const radius =
				screenPositions.reduce(
					(max, point) =>
						Math.max(
							max,
							Math.hypot(point.x - centroid.x, point.y - centroid.y)
						),
					0
				) + CLUSTER_RADIUS_PADDING;

			clusterGeometryCache.push({
				cluster,
				geometry: { x: centroid.x, y: centroid.y, radius }
			});

			const name = resolvedClusterNames.get(cluster.hash);

			context.globalAlpha = name ? 1 : CLUSTER_UNNAMED_STROKE_ALPHA;
			context.setLineDash(CLUSTER_DASH_PATTERN);
			context.strokeStyle = CLUSTER_STROKE_COLOR;
			context.lineWidth = CLUSTER_STROKE_WIDTH;
			context.beginPath();
			context.arc(centroid.x, centroid.y, radius, 0, Math.PI * 2);
			context.stroke();
			context.setLineDash([]);
			context.globalAlpha = 1;

			if (name) {
				context.fillStyle = CLUSTER_NAME_COLOR;
				context.font = CLUSTER_NAME_FONT;
				context.textAlign = "center";
				context.textBaseline = "alphabetic";
				context.fillText(
					name,
					centroid.x,
					centroid.y - radius - CLUSTER_LABEL_GAP
				);
			}

			if (hoveredClusterHit?.cluster.hash === cluster.hash) {
				context.fillStyle = CLUSTER_LABEL_COLOR;
				context.font = CLUSTER_LABEL_FONT;
				context.textAlign = "center";
				context.textBaseline = "top";
				context.fillText(
					`${screenPositions.length}`,
					centroid.x,
					centroid.y + radius + CLUSTER_LABEL_GAP
				);
				context.textBaseline = "alphabetic";
			}
		}
	};

	const truncateToWidth = (
		context: CanvasRenderingContext2D,
		text: string,
		maxWidth: number
	): string => {
		if (context.measureText(text).width <= maxWidth) return text;
		const ellipsis = "…";
		let truncated = text;
		while (
			truncated.length > 0 &&
			context.measureText(truncated + ellipsis).width > maxWidth
		) {
			truncated = truncated.slice(0, -1);
		}
		return truncated.length > 0 ? truncated + ellipsis : ellipsis;
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
			context.lineWidth = HIGHLIGHT_RING_WIDTH;
			context.beginPath();
			context.arc(
				screen.x,
				screen.y,
				radius + HIGHLIGHT_RING_OFFSET,
				0,
				Math.PI * 2
			);
			context.stroke();

			const title = songByKey.get(songKey)?.title ?? songKey;
			const label = truncateToWidth(context, title, HIGHLIGHT_LABEL_MAX_WIDTH);
			context.fillStyle = HIGHLIGHT_LABEL_COLOR;
			context.fillText(
				label,
				screen.x,
				screen.y - radius - HIGHLIGHT_RING_OFFSET - HIGHLIGHT_LABEL_GAP
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

	const findClusterAt = (anchor: HoverCardAnchor): ClusterHit | null =>
		clusterGeometryCache.reduce<ClusterHit | null>((best, hit) => {
			const distance = Math.hypot(
				hit.geometry.x - anchor.x,
				hit.geometry.y - anchor.y
			);
			if (distance > hit.geometry.radius) return best;
			return !best || hit.geometry.radius < best.geometry.radius ? hit : best;
		}, null);

	const findPointAt = (anchor: HoverCardAnchor): string | null => {
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

	const handlePointerMove = (event: MouseEvent) => {
		if (!containerEl) return;
		const anchor = anchorFromMouseEvent(event, containerEl);
		const songKey = findPointAt(anchor);
		hoveredSongKey = songKey;
		hoverAnchor = songKey === null ? null : anchor;
		hoveredClusterHit = songKey === null ? findClusterAt(anchor) : null;
	};

	const handlePointerLeave = () => {
		hoveredSongKey = null;
		hoverAnchor = null;
		hoveredClusterHit = null;
	};

	// The song closest to the cluster's live centroid — a representative core
	// member, less likely than a fringe point to drift out on minor changes,
	// so the anchor stays put across the same kinds of drift it's meant to
	// survive.
	const anchorSongKeyFor = (hit: ClusterHit): string | null => {
		let closest: { songKey: string; distance: number } | null = null;
		for (const songKey of hit.cluster.songKeys) {
			const position = displayedPositions.get(songKey);
			if (!position) continue;
			const screen = toScreen(position);
			const distance = Math.hypot(
				screen.x - hit.geometry.x,
				screen.y - hit.geometry.y
			);
			if (!closest || distance < closest.distance) {
				closest = { songKey, distance };
			}
		}
		return closest?.songKey ?? hit.cluster.songKeys[0] ?? null;
	};

	const openNamingInput = (hit: ClusterHit) => {
		// Renaming an already-named cluster reuses its existing anchor instead
		// of picking a fresh one, so it doesn't leave the old anchor's entry
		// behind as an orphaned duplicate.
		const anchorSongKey =
			findNamedClusterFor(hit.cluster)?.anchorSongKey ?? anchorSongKeyFor(hit);
		namingInput = {
			cluster: hit.cluster,
			anchorSongKey,
			x: hit.geometry.x,
			y: Math.max(24, hit.geometry.y - hit.geometry.radius - CLUSTER_LABEL_GAP),
			initialName: resolvedClusterNames.get(hit.cluster.hash) ?? ""
		};
	};

	const commitNamingInput = () => {
		if (!namingInput) return;
		if (namingInput.anchorSongKey) {
			setClusterName(
				namingInput.anchorSongKey,
				namingInputEl?.value.trim() ?? ""
			);
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

	const handleClick = () => {
		if (hoveredSongKey !== null) {
			onSelect(hoveredSongKey === selectedSongKey ? null : hoveredSongKey);
			return;
		}
		if (hoveredClusterHit !== null) {
			openNamingInput(hoveredClusterHit);
			return;
		}
		onSelect(null);
	};

	$effect(() => {
		if (namingInput && namingInputEl) {
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
		void neighborSongKeys;
		void drawablePoints;
		void clusters;
		void resolvedClusterNames;
		void highlightedSongKeys;
		void hoveredClusterHit;
		draw();
	});

	const hoveredSong = $derived(
		hoveredSongKey === null ? null : (songByKey.get(hoveredSongKey) ?? null)
	);

	const tooltipStyle = $derived(hoverCardStyle(hoverAnchor, width));

	const hoveredPointExists = $derived(
		hoveredSongKey !== null && pointBySongKey.has(hoveredSongKey)
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
	onmouseleave={handlePointerLeave}
	onclick={handleClick}
	onkeydown={(event) => {
		if (event.key === "Enter" || event.key === " ") handleClick();
		if (event.key === "Escape") onSelect(null);
	}}
>
	<canvas bind:this={canvasEl} style:width="{width}px" style:height="{height}px"
	></canvas>

	{#if clustersAvailable}
		<button
			class="cluster-toggle"
			type="button"
			aria-pressed={showClusters}
			onclick={() => (showClusters = !showClusters)}
		>
			clusters: {showClusters ? "on" : "off"}
		</button>
	{/if}

	{#if hoveredSong && hoveredPointExists && hoverAnchor}
		<div class="tooltip" style={tooltipStyle}>
			<SongTooltip song={hoveredSong} />
		</div>
	{/if}

	{#if namingInput}
		<input
			class="cluster-name-input"
			style:left="{namingInput.x}px"
			style:top="{namingInput.y}px"
			value={namingInput.initialName}
			placeholder="name this cluster…"
			aria-label="Cluster name"
			bind:this={namingInputEl}
			onclick={(event) => event.stopPropagation()}
			onkeydown={handleNamingKeydown}
			onblur={commitNamingInput}
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

	.cluster-toggle {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		font-family: inherit;
		font-size: 0.65rem;
		color: #a1a1aa;
		padding: 0.25rem 0.625rem;
		border-radius: 9999px;
		border: 1px solid rgba(63, 63, 70, 0.8);
		background: rgba(9, 9, 11, 0.75);
		cursor: pointer;
	}

	.cluster-toggle:hover {
		color: #e4e4e7;
		border-color: rgba(113, 113, 122, 0.9);
	}

	.cluster-toggle[aria-pressed="true"] {
		border-color: rgba(99, 102, 241, 0.5);
		background: rgba(99, 102, 241, 0.18);
		color: #e4e4e7;
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
		max-height: calc(100% - 2rem);
		overflow-y: auto;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.75rem;
		color: #f4f4f5;
	}
</style>
