import { prefersReducedMotion } from "svelte/motion";
import { songDots, type DotAnchor } from "$runes/songDots.svelte.js";
import type { SongLabelLine } from "../songLabelText.js";
import { MAX_PIXEL_RATIO, PIN_TRAVEL_MS } from "./constants.js";
import { markerWidths } from "./paint/markedSongs.js";
import { prepareCanvas } from "./paint/scene.js";
import {
	drawSongDot,
	drawSongLabel,
	measureSongLabel,
	type DotLook
} from "./paint/songMark.js";
import {
	anchorPose,
	createPin,
	labelRoom,
	landed,
	poseAt,
	retarget,
	type Pin,
	type PinPose
} from "./songPinMath.js";

export type PinLook = {
	fill: string;
	lines: readonly SongLabelLine[];
	textColor: string;
	haloColor: string;
};

type PinnedSong = {
	pin: Pin;
	// What it's heading to: an anchor, or (null) its place on the map.
	anchor: DotAnchor | null;
	settled: boolean;
};

type PinFrame = {
	pose: PinPose;
	anchor: DotAnchor | null;
	look: PinLook;
	maxWidth: number;
	clip: DOMRect | null;
};

// Draws each anchored song's mark (see songDots) on the pin canvas at its
// anchor, travelling there from wherever the mark was (its place on the
// map, or another anchor) and back to the map once its anchor goes away.
// A frame loop runs only while there are anchors or marks travelling; it
// repaints only when something drawn changed.
export const createSongPins = ({
	canvas,
	mapPoseOf,
	lookOf
}: {
	readonly canvas: HTMLCanvasElement | null;
	// Where the song's mark is on the map now, or null when it isn't drawn.
	mapPoseOf: (songKey: string) => PinPose | null;
	lookOf: (songKey: string) => PinLook;
}) => {
	const pinned = new Map<string, PinnedSong>();
	// Changes only when a song is pinned or let go, so the map redraws then.
	let pinnedSongKeys = $state.raw<ReadonlySet<string>>(new Set());
	let paintedSignature = "";

	const travelMs = () => (prefersReducedMotion.current ? 0 : PIN_TRAVEL_MS);

	const syncPinnedSongKeys = () => {
		if (
			pinned.size === pinnedSongKeys.size &&
			[...pinned.keys()].every((songKey) => pinnedSongKeys.has(songKey))
		) {
			return;
		}
		pinnedSongKeys = new Set(pinned.keys());
	};

	const frameFor = (
		context: CanvasRenderingContext2D,
		songKey: string,
		nowMs: number
	): PinFrame | null => {
		const anchor = songDots.anchors.get(songKey) ?? null;
		const look = lookOf(songKey);
		const rect = anchor?.el.getBoundingClientRect() ?? null;
		const target =
			anchor && rect
				? anchorPose(rect, anchor, {
						lineCount: look.lines.length,
						textWidth:
							anchor.label === "beside"
								? measureSongLabel(context, look.lines, anchor.labelPx)
								: 0
					})
				: mapPoseOf(songKey);
		if (!target) {
			pinned.delete(songKey);
			return null;
		}

		let song = pinned.get(songKey);
		if (!song) {
			const from = mapPoseOf(songKey);
			song = {
				pin: createPin(from ?? target, nowMs, from ? travelMs() : 0),
				anchor,
				settled: false
			};
			pinned.set(songKey, song);
		} else if (song.anchor !== anchor) {
			song.pin = retarget(song.pin, nowMs, travelMs());
			song.anchor = anchor;
			song.settled = false;
		}

		const pose = poseAt(song.pin, nowMs, target);
		song.pin.current = pose;
		if (landed(song.pin, nowMs)) {
			if (!anchor) {
				pinned.delete(songKey);
				return null;
			}
			if (!song.settled) {
				song.settled = true;
				songDots.settle(songKey);
			}
		}
		return {
			pose,
			anchor,
			look,
			maxWidth: rect ? labelRoom(rect, pose) : Infinity,
			clip: anchor?.clipEl?.getBoundingClientRect() ?? null
		};
	};

	const signatureOf = (frames: readonly PinFrame[]): string =>
		[
			canvas?.clientWidth,
			canvas?.clientHeight,
			window.devicePixelRatio,
			...frames.map(({ pose, anchor, look, maxWidth, clip }) =>
				[
					...Object.values(pose).map((value) => value.toFixed(2)),
					Math.round(maxWidth),
					clip && [clip.left, clip.top, clip.width, clip.height].join(),
					anchor?.playable,
					anchor?.playing,
					anchor?.playing && anchor.progress.toFixed(3),
					anchor?.hovered,
					look.fill,
					look.textColor,
					look.lines.flat().map(({ text }) => text)
				].join()
			)
		].join("|");

	const dotLookOf = ({ pose, anchor, look }: PinFrame): DotLook => {
		const playing = anchor?.playing ?? false;
		return {
			fill: look.fill,
			alpha: 1,
			...markerWidths({
				restingRadius: pose.r,
				emphasis: playing ? 1 : 0,
				outlined: true
			}),
			icon: playing
				? {
						kind: "playing",
						emphasis: 1,
						playback: {
							progressFraction: anchor?.progress ?? 0,
							chordSegments: []
						}
					}
				: anchor?.playable && anchor.hovered
					? { kind: "play" }
					: { kind: "none" }
		};
	};

	const clipped = (
		context: CanvasRenderingContext2D,
		clip: DOMRect | null,
		draw: () => void
	) => {
		context.save();
		if (clip) {
			context.beginPath();
			context.rect(clip.left, clip.top, clip.width, clip.height);
			context.clip();
		}
		draw();
		context.restore();
	};

	const paint = (frames: readonly PinFrame[]) => {
		if (!canvas) return;
		const context = prepareCanvas(
			canvas,
			canvas.clientWidth,
			canvas.clientHeight,
			Math.min(MAX_PIXEL_RATIO, window.devicePixelRatio || 1)
		);
		if (!context) return;
		for (const frame of frames) {
			clipped(context, frame.clip, () =>
				drawSongDot(context, frame.pose, dotLookOf(frame))
			);
		}
		for (const { pose, look, maxWidth, clip } of frames) {
			if (pose.labelAlpha <= 0 || look.lines.length === 0) continue;
			clipped(context, clip, () =>
				drawSongLabel(context, pose, {
					lines: look.lines,
					alpha: pose.labelAlpha,
					textColor: look.textColor,
					haloColor: look.haloColor,
					maxWidth
				})
			);
		}
	};

	const tick = (nowMs: number) => {
		const context = canvas?.getContext("2d");
		if (!context) return;
		const songKeys = new Set([...songDots.anchors.keys(), ...pinned.keys()]);
		const frames = [...songKeys].flatMap(
			(songKey) => frameFor(context, songKey, nowMs) ?? []
		);
		syncPinnedSongKeys();
		const signature = signatureOf(frames);
		if (signature === paintedSignature) return;
		paintedSignature = signature;
		paint(frames);
	};

	$effect(() => {
		if (!canvas) return;
		if (songDots.anchors.size === 0 && pinnedSongKeys.size === 0) {
			if (paintedSignature !== "") paint([]);
			paintedSignature = "";
			return;
		}
		// Labels may be painted before their web fonts arrive.
		const repaint = () => (paintedSignature = "");
		document.fonts.addEventListener("loadingdone", repaint);
		let frame = requestAnimationFrame(function loop(nowMs) {
			tick(nowMs);
			frame = requestAnimationFrame(loop);
		});
		return () => {
			cancelAnimationFrame(frame);
			document.fonts.removeEventListener("loadingdone", repaint);
		};
	});

	return {
		// Songs whose mark is drawn here, so the map leaves them out.
		get pinnedSongKeys(): ReadonlySet<string> {
			return pinnedSongKeys;
		}
	};
};
