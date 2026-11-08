import { untrack } from "svelte";
import { select, zoom, type ZoomTransform } from "d3";
import type { DensityCluster } from "../../embedding/clustering/densityClusters.js";
import { findNamedCluster } from "./clusterNames.js";
import {
	FLY_TO_TRANSITION_MS,
	FLY_TO_ZOOM_OUT_FACTOR,
	FOCUS_TRANSITION_MS,
	HEX_FOCUS_SCALE,
	MAX_ZOOM,
	MIN_ZOOM,
	SCRIPTED_FOCUS_TRANSITION_MS,
	ZOOM_SONG_HEX_FACTOR
} from "./constants.js";
import type { FocusFrame, Point2D, ViewSize } from "./types.js";
import * as view from "./viewport.js";

export type CameraInput = {
	readonly canvas: HTMLCanvasElement | null;
	readonly movable: boolean;
	readonly width: number;
	readonly height: number;
	readonly viewSize: ViewSize;
	readonly transform: ZoomTransform;
	// The full, unzoomed view, shifted down by offsetY.
	readonly homeTransform: ZoomTransform;
	readonly hexMode: boolean;
	readonly focusFrame: FocusFrame | null;
	readonly focusScale: number;
	readonly focusSongKey: string | null | undefined;
	readonly focusClusterName: string | null | undefined;
	readonly selectedClusterName: string | null;
	readonly zoomSongKey: string | null;
	readonly selectedSongKey: string | null;
	readonly clusters: readonly DensityCluster[];
	readonly clusterNames: ReadonlyMap<string, string>;
	// A drawn song's base (unzoomed) pixel, or null.
	basePixelOf: (songKey: string) => Point2D | null;
	// Any song's base pixel, drawn or filtered out, or null.
	anyBasePixelOf: (songKey: string) => Point2D | null;
	// Called on every view change; byUser for drags, wheels and pinches.
	onZoom: (transform: ZoomTransform, byUser: boolean) => void;
	onGestureStart: () => void;
	onGestureEnd: () => void;
};

// Pan and zoom: d3's zoom behavior on the canvas (user gestures, only when
// movable), plus every scripted camera move driven by props.
export const createCamera = (input: CameraInput) => {
	let zoomBehavior: ReturnType<typeof zoom<HTMLCanvasElement, unknown>> | null =
		null;

	const constrain = (t: ZoomTransform) =>
		view.constrainTransform(input.viewSize, t);

	const animateTo = (
		canvas: HTMLCanvasElement,
		target: ZoomTransform,
		durationMs: number
	) => {
		if (!zoomBehavior) return;
		select(canvas)
			.transition()
			.duration(durationMs)
			.call(zoomBehavior.transform, target);
	};

	// Moves the view instantly. d3 runs the zoom handlers synchronously here,
	// and they read hover state, so it's untracked: otherwise the calling
	// effect would re-run (and zoom back) whenever a song is hovered.
	const jumpTo = (canvas: HTMLCanvasElement, target: ZoomTransform) => {
		untrack(() => {
			if (zoomBehavior) select(canvas).call(zoomBehavior.transform, target);
		});
	};

	// Fits the biggest cluster with this name (case-insensitive) to the
	// view, or null if there's none or none of its songs are drawn.
	const clusterTarget = (clusterName: string): ZoomTransform | null => {
		const cluster = findNamedCluster(
			input.clusters,
			input.clusterNames,
			clusterName
		);
		if (!cluster) return null;
		return view.clusterFocusTransform(
			input.viewSize,
			cluster.songKeys.flatMap((songKey) => {
				const base = input.basePixelOf(songKey);
				return base ? [base] : [];
			}),
			{ hexMode: input.hexMode, focusFrame: input.focusFrame }
		);
	};

	const isScripted = () =>
		input.focusClusterName !== undefined || input.focusSongKey !== undefined;

	// The zoom behavior itself, rebuilt when the canvas or movable changes.
	$effect(() => {
		const canvas = input.canvas;
		if (!canvas) return;
		const canMove = input.movable;
		zoomBehavior = zoom<HTMLCanvasElement, unknown>()
			.scaleExtent([MIN_ZOOM, MAX_ZOOM])
			.constrain(constrain)
			// d3's default filter (no ctrl-drag, primary button only), and
			// nothing at all unless movable. Scripted zooms bypass the filter.
			.filter((event) => {
				if (!canMove) return false;
				if (event.ctrlKey && event.type !== "wheel") return false;
				return !event.button;
			})
			.on("start", () => input.onGestureStart())
			.on("end", () => input.onGestureEnd())
			// Scripted zooms have no sourceEvent.
			.on("zoom", (event) =>
				input.onZoom(event.transform, !!event.sourceEvent)
			);
		select(canvas).call(zoomBehavior);
		return () => {
			select(canvas).on(".zoom", null);
			zoomBehavior = null;
		};
	});

	// Scripted zoom (e.g. /story's beats): fully inert when both focusSongKey
	// and focusClusterName are undefined (their prop defaults), so ordinary
	// interactive pages never trigger this. focusClusterName takes priority
	// when both are set. For either: a string animates the view to center on
	// it (fitting the whole cluster, for focusClusterName), null animates
	// back out to the full view. A focus set from the start jumps straight
	// there; once the map has been shown, focus changes animate.
	let hasFocused = false;
	$effect(() => {
		const canvas = input.canvas;
		if (!canvas || !zoomBehavior || input.width === 0 || input.height === 0) {
			return;
		}
		const { focusClusterName, focusSongKey } = input;
		if (focusClusterName === undefined && focusSongKey === undefined) {
			hasFocused = true;
			return;
		}

		const target = ((): ZoomTransform | null => {
			if (focusClusterName !== undefined) {
				if (focusClusterName === null) return input.homeTransform;
				return clusterTarget(focusClusterName);
			}
			if (focusSongKey === null) return input.homeTransform;
			if (focusSongKey === undefined) return null;
			const base = input.anyBasePixelOf(focusSongKey);
			if (!base) return null;
			return view.transformCenteredOn(input.viewSize, base, input.focusScale);
		})();
		if (!target) return;

		if (!hasFocused) {
			hasFocused = true;
			jumpTo(canvas, constrain(target));
			return;
		}
		animateTo(canvas, constrain(target), SCRIPTED_FOCUS_TRANSITION_MS);
	});

	// Fits selectedClusterName, again whenever the frame or size changes
	// (e.g. a panel opening below the map shrinks the frame). A zoomSongKey
	// takes priority (see below).
	$effect(() => {
		const clusterName = input.selectedClusterName;
		const canvas = input.canvas;
		void input.focusFrame;
		if (input.zoomSongKey) return;
		if (!clusterName || !canvas || !zoomBehavior) return;
		if (input.width === 0 || input.height === 0) return;
		untrack(() => {
			const target = clusterTarget(clusterName);
			if (target) animateTo(canvas, constrain(target), FOCUS_TRANSITION_MS);
		});
	});

	// Centers zoomSongKey, in focusFrame when there is one, again whenever
	// the frame or size changes.
	$effect(() => {
		const songKey = input.zoomSongKey;
		const canvas = input.canvas;
		const frame = input.focusFrame;
		if (!songKey || !canvas || !zoomBehavior) return;
		if (input.width === 0 || input.height === 0) return;
		untrack(() => {
			const base = input.basePixelOf(songKey);
			if (!base) return;
			const scale = input.hexMode
				? Math.min(HEX_FOCUS_SCALE * ZOOM_SONG_HEX_FACTOR, MAX_ZOOM)
				: input.focusScale;
			const target =
				frame && frame.height > 0
					? view.transformCenteredInFrame(input.width, frame, base, scale)
					: view.transformCenteredOn(input.viewSize, base, scale);
			animateTo(canvas, constrain(target), FOCUS_TRANSITION_MS);
		});
	});

	// Without a scripted focus, moves to the resting view when offsetY
	// changes: a jump the first time, then animated. (With one, the effect
	// above re-targets instead, since its targets depend on offsetY too.)
	let hasPlacedHome = false;
	$effect(() => {
		const target = input.homeTransform;
		const canvas = input.canvas;
		if (!canvas || !zoomBehavior) return;
		if (untrack(isScripted)) return;
		if (!hasPlacedHome) {
			hasPlacedHome = true;
			jumpTo(canvas, target);
			return;
		}
		animateTo(canvas, target, FOCUS_TRANSITION_MS);
	});

	// When a song is selected off screen, flies to it, zooming out a bit.
	$effect(() => {
		const songKey = input.selectedSongKey;
		if (songKey === null || isScripted()) return;
		untrack(() => {
			const canvas = input.canvas;
			const base = input.basePixelOf(songKey);
			const { width, height } = input;
			if (!canvas || !zoomBehavior || !base || width === 0 || height === 0) {
				return;
			}
			const { transform } = input;
			const screen = {
				x: transform.applyX(base.x),
				y: transform.applyY(base.y)
			};
			if (view.isOnScreen(input.viewSize, screen)) return;
			const scale = Math.max(MIN_ZOOM, transform.k * FLY_TO_ZOOM_OUT_FACTOR);
			animateTo(
				canvas,
				constrain(view.transformCenteredOn(input.viewSize, base, scale)),
				FLY_TO_TRANSITION_MS
			);
		});
	});

	return {
		// Zooms to scale around a screen point, e.g. a clicked hex.
		scaleAround: (anchor: Point2D, scale: number, durationMs: number) => {
			const canvas = input.canvas;
			if (!canvas || !zoomBehavior) return;
			select(canvas)
				.transition()
				.duration(durationMs)
				.call(zoomBehavior.scaleTo, scale, [anchor.x, anchor.y]);
		}
	};
};
