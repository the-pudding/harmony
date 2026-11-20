import { easeCubicInOut } from "d3";
import {
	SONG_LABEL_LINE_HEIGHT_PX,
	SONG_LABEL_STYLE
} from "../songLabelText.js";
import { OUTLINED_LABEL_GAP } from "./constants.js";
import { lerp } from "./pointStyle.js";
import type { MarkPose } from "./paint/songMark.js";

// A mark's pose plus how visible its label is.
export type PinPose = MarkPose & { labelAlpha: number };

// A pinned song's mark easing from a frozen pose to a live target, which
// may move while it travels (an anchor being laid out, a dot on the map).
export type Pin = {
	from: PinPose;
	current: PinPose;
	startMs: number;
	durationMs: number;
	// How long it holds its from pose before setting off.
	delayMs: number;
};

export type AnchorRect = {
	left: number;
	top: number;
	width: number;
	height: number;
};

export const createPin = (
	from: PinPose,
	nowMs: number,
	durationMs: number,
	delayMs = 0
): Pin => ({ from, current: from, startMs: nowMs, durationMs, delayMs });

const progressAt = (pin: Pin, nowMs: number): number => {
	const elapsedMs = nowMs - pin.startMs - pin.delayMs;
	return pin.durationMs <= 0
		? elapsedMs >= 0
			? 1
			: 0
		: Math.min(1, Math.max(0, elapsedMs / pin.durationMs));
};

export const landed = (pin: Pin, nowMs: number): boolean =>
	progressAt(pin, nowMs) === 1;

export const poseAt = (pin: Pin, nowMs: number, target: PinPose): PinPose => {
	const t = easeCubicInOut(progressAt(pin, nowMs));
	if (t === 1) return target;
	const { from } = pin;
	return {
		x: lerp(from.x, target.x, t),
		y: lerp(from.y, target.y, t),
		r: lerp(from.r, target.r, t),
		labelDx: lerp(from.labelDx, target.labelDx, t),
		labelDy: lerp(from.labelDy, target.labelDy, t),
		labelPx: lerp(from.labelPx, target.labelPx, t),
		labelAlpha: lerp(from.labelAlpha, target.labelAlpha, t)
	};
};

// Starts a new trip toward another target from wherever the mark is now.
export const retarget = (
	pin: Pin,
	nowMs: number,
	durationMs = pin.durationMs,
	delayMs = 0
): Pin => ({ ...pin, from: pin.current, startMs: nowMs, durationMs, delayMs });

// The label's line height and its gap from the dot, at a title size.
export const labelMetrics = (labelPx: number) => {
	const scale = labelPx / SONG_LABEL_STYLE.title.fontSizePx;
	return {
		lineHeight: SONG_LABEL_LINE_HEIGHT_PX * scale,
		gap: OUTLINED_LABEL_GAP * scale
	};
};

// Where an anchor's box puts the mark: the dot at the box's left edge (or
// the dot and its label centered in it) and halfway down, the label beside
// it, centered on the dot.
export const anchorPose = (
	rect: AnchorRect,
	{
		radius,
		label,
		labelPx,
		align
	}: {
		radius: number;
		label: "none" | "beside";
		labelPx: number;
		align: "start" | "center";
	},
	{ lineCount, textWidth }: { lineCount: number; textWidth: number }
): PinPose => {
	const { lineHeight, gap } = labelMetrics(labelPx);
	const labeled = label === "beside";
	const markWidth = 2 * radius + (labeled ? gap + textWidth : 0);
	const left =
		align === "start"
			? rect.left
			: rect.left + Math.max(0, rect.width - markWidth) / 2;
	return {
		x: left + radius,
		y: rect.top + rect.height / 2,
		r: radius,
		labelDx: radius + gap,
		labelDy: -(lineCount * lineHeight) / 2,
		labelPx,
		labelAlpha: labeled ? 1 : 0
	};
};

// How wide the label may be before it leaves the anchor's box.
export const labelRoom = (rect: AnchorRect, pose: PinPose): number =>
	rect.left + rect.width - (pose.x + pose.labelDx);
