import type { Guide } from "$components/storymap/layouts/types.js";
import type { ScatterAxisLabels } from "../../scatterPoint.js";
import {
	AXIS_LABEL_COLOR,
	AXIS_LABEL_FONT,
	GUIDE_BOTTOM_RIGHT_CLEARANCE,
	GUIDE_FADE_FRACTION,
	GUIDE_LABEL_GAP,
	PLOT_MARGIN
} from "../constants.js";
import { frameRect } from "../viewport.js";
import type { MapFrame } from "../types.js";
import type { Scene } from "./scene.js";

// How visible a layout's guides are while the map moves between layouts,
// by how far through the transition it is (0–1): the outgoing layout's
// fade out over the first GUIDE_FADE_FRACTION, the incoming layout's fade
// in over the last. At rest (progress 1) only the incoming ones show.
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

// A set of guides and how visible they are.
export type GuideSet = { guides: readonly Guide[]; opacity: number };

// Each set's guides, in frame coordinates (0–1 across the rect framed
// layouts fill, y up) and fixed on the screen, so an axis label stays put
// while the camera zooms. The frame's own inset leaves room under it for
// them.
export const drawGuides = (
	{ context, viewport: { width, height } }: Scene,
	sets: readonly GuideSet[],
	frame: MapFrame
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
				case "columnLabel":
					context.textAlign = "center";
					context.fillText(
						guide.text,
						left + guide.x * rect.width,
						top + (1 - guide.y) * rect.height
					);
					break;
			}
		}
	}
	context.globalAlpha = 1;
};

// The x label centered under the plot, the y label rotated along its left.
// (The scatter's own axisLabels prop; layouts' guides are drawn above.)
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
