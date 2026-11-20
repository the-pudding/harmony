import { curveMonotoneX, easeCubicInOut, line } from "d3";
import type { Guide, GuideLayer } from "$components/storymap/layouts/types.js";
import type { ScatterAxisLabels } from "../../scatterPoint.js";
import {
	AXIS_LABEL_COLOR,
	AXIS_LABEL_FONT,
	CHART_BOX_COLOR,
	CHART_BOX_FILL,
	CHART_BOX_WIDTH,
	CHART_LABEL_COLOR,
	CHART_LABEL_HALO,
	CHART_LABEL_HALO_WIDTH,
	CHART_LABEL_SIZE_PX,
	CHART_LINE_HALO_WIDTH,
	CHART_LINE_WIDTH,
	CHART_SHADE_FILL,
	GUIDE_BOTTOM_RIGHT_CLEARANCE,
	GUIDE_FADE_FRACTION,
	GUIDE_LABEL_GAP,
	PLOT_MARGIN
} from "../constants.js";
import { frameRect } from "../viewport.js";
import { SONG_LABEL_FONT_FAMILY } from "../../songLabelText.js";
import type { MapFrame } from "../types.js";
import type { Scene } from "./scene.js";

// Guide opacity by transition progress (0–1): outgoing guides fade out over
// the first GUIDE_FADE_FRACTION, incoming ones fade in over the last.
export const guideOpacities = (
	progress: number
): { outgoing: number; incoming: number } => {
	const clamp = (value: number) => Math.min(1, Math.max(0, value));
	return {
		outgoing: clamp(1 - progress / GUIDE_FADE_FRACTION),
		incoming: clamp(
			(progress - (1 - GUIDE_FADE_FRACTION)) / GUIDE_FADE_FRACTION
		)
	};
};

export type GuideSet = { guides: readonly Guide[]; opacity: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const idOf = (guide: Guide): string | undefined =>
	guide.kind === "label" || guide.kind === "box" || guide.kind === "line"
		? guide.id
		: undefined;

// Lines are over the songs unless layered under; everything else is under.
const layerOf = (guide: Guide): GuideLayer => {
	switch (guide.kind) {
		case "label":
		case "box":
			return guide.layer ?? "under";
		case "line":
			return guide.layer ?? "over";
		default:
			return "under";
	}
};

// A guide partway (t, 0–1) from its outgoing self to its incoming one.
const between = (from: Guide, to: Guide, t: number): Guide | null => {
	if (to.kind === "label" && from.kind === "label") {
		return { ...to, x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) };
	}
	if (to.kind === "box" && from.kind === "box") {
		return {
			...to,
			x: lerp(from.x, to.x, t),
			y: lerp(from.y, to.y, t),
			width: lerp(from.width, to.width, t),
			height: lerp(from.height, to.height, t)
		};
	}
	if (
		to.kind === "line" &&
		from.kind === "line" &&
		from.points.length === to.points.length
	) {
		return {
			...to,
			points: to.points.map((point, i) => ({
				x: lerp(from.points[i].x, point.x, t),
				y: lerp(from.points[i].y, point.y, t)
			}))
		};
	}
	return null;
};

// The outgoing and incoming layouts' guides at a transition's progress
// (0–1): a label, box or line with the same id in both moves from its old
// spot to its new one; the rest crossfade by guideOpacities.
export const transitionGuides = (
	outgoing: readonly Guide[],
	incoming: readonly Guide[],
	progress: number
): GuideSet[] => {
	const opacities = guideOpacities(progress);
	if (outgoing.length === 0) {
		return [{ guides: incoming, opacity: opacities.incoming }];
	}
	const fromById = new Map<string, Guide>();
	for (const guide of outgoing) {
		const id = idOf(guide);
		if (id !== undefined) fromById.set(id, guide);
	}
	const t = easeCubicInOut(Math.min(1, Math.max(0, progress)));
	const moved = new Set<string>();
	const moving: Guide[] = [];
	const appearing: Guide[] = [];
	for (const guide of incoming) {
		const id = idOf(guide);
		const from = id === undefined ? undefined : fromById.get(id);
		const partway = from === undefined ? null : between(from, guide, t);
		if (partway) {
			moved.add(id!);
			moving.push(partway);
		} else {
			appearing.push(guide);
		}
	}
	const leaving = outgoing.filter((guide) => {
		const id = idOf(guide);
		return id === undefined || !moved.has(id);
	});
	return [
		{ guides: leaving, opacity: opacities.outgoing },
		{ guides: appearing, opacity: opacities.incoming },
		{ guides: moving, opacity: 1 }
	];
};

// Frame coordinates (0–1 across the framed rect, y up), fixed on screen so
// axis labels stay put while the camera zooms. Draws the guides in one
// layer: call it under the songs, then over them.
export const drawGuides = (
	{ context, viewport: { width, height } }: Scene,
	sets: readonly GuideSet[],
	frame: MapFrame,
	layer: GuideLayer = "under"
) => {
	const rect = frameRect({ width, height }, frame);
	const left = rect.x;
	const right = rect.x + rect.width;
	const top = rect.y;
	const bottom = rect.y + rect.height;
	context.fillStyle = AXIS_LABEL_COLOR;
	context.font = AXIS_LABEL_FONT;
	context.textBaseline = "alphabetic";
	for (const { guides, opacity } of sets) {
		if (!(opacity > 0)) continue;
		context.globalAlpha = opacity;
		for (const guide of guides) {
			if (layerOf(guide) !== layer) continue;
			switch (guide.kind) {
				case "axisLabel":
					if (guide.at === "bottom-right") {
						context.textAlign = "right";
						context.fillText(
							guide.text,
							right - GUIDE_BOTTOM_RIGHT_CLEARANCE,
							bottom + GUIDE_LABEL_GAP
						);
					} else if (guide.at === "bottom-left") {
						context.textAlign = "left";
						context.fillText(guide.text, left, bottom + GUIDE_LABEL_GAP);
					} else {
						context.textAlign = "left";
						context.fillText(guide.text, left, top - GUIDE_LABEL_GAP / 2);
					}
					break;
				case "tick":
					context.textAlign = "center";
					context.fillText(
						guide.text,
						left + guide.x * rect.width,
						bottom + GUIDE_LABEL_GAP
					);
					break;
				case "label": {
					const x = left + guide.x * rect.width;
					const y = top + (1 - guide.y) * rect.height;
					context.fillStyle = guide.color ?? CHART_LABEL_COLOR;
					context.font = `${guide.weight === "bold" ? 600 : 400} ${CHART_LABEL_SIZE_PX[guide.size ?? "regular"]}px ${SONG_LABEL_FONT_FAMILY}`;
					context.textAlign = guide.align;
					context.textBaseline = "middle";
					if (layer === "over") {
						context.strokeStyle = CHART_LABEL_HALO;
						context.lineWidth = CHART_LABEL_HALO_WIDTH;
						context.lineJoin = "round";
						context.strokeText(guide.text, x, y);
					}
					context.fillText(guide.text, x, y);
					context.fillStyle = AXIS_LABEL_COLOR;
					context.font = AXIS_LABEL_FONT;
					context.textBaseline = "alphabetic";
					break;
				}
				case "box": {
					const box = [
						left + guide.x * rect.width,
						top + (1 - guide.y - guide.height) * rect.height,
						guide.width * rect.width,
						guide.height * rect.height
					] as const;
					if (guide.style === "shade") {
						context.fillStyle = CHART_SHADE_FILL;
						context.fillRect(...box);
					} else {
						context.fillStyle = CHART_BOX_FILL;
						context.fillRect(...box);
						context.strokeStyle = CHART_BOX_COLOR;
						context.lineWidth = CHART_BOX_WIDTH;
						context.strokeRect(...box);
					}
					context.fillStyle = AXIS_LABEL_COLOR;
					break;
				}
				case "line": {
					context.beginPath();
					line<{ x: number; y: number }>()
						.x(({ x }) => left + x * rect.width)
						.y(({ y }) => top + (1 - y) * rect.height)
						.curve(curveMonotoneX)
						.context(context)(guide.points);
					context.lineJoin = "round";
					context.lineCap = "round";
					context.strokeStyle = CHART_LABEL_HALO;
					context.lineWidth = CHART_LINE_HALO_WIDTH;
					context.stroke();
					context.strokeStyle = guide.color;
					context.lineWidth = CHART_LINE_WIDTH;
					context.stroke();
					break;
				}
			}
		}
	}
	context.globalAlpha = 1;
};

// x label centered under the plot, y label rotated along its left.
export const drawAxisLabels = (
	{ context, viewport: { width, height } }: Scene,
	axisLabels: ScatterAxisLabels | null
) => {
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
