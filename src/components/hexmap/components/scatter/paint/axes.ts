import type { ScatterAxisLabels } from "../../scatterPoint.js";
import {
	AXIS_LABEL_COLOR,
	AXIS_LABEL_FONT,
	PLOT_MARGIN
} from "../constants.js";
import type { Scene } from "./scene.js";

// The x label centered under the plot, the y label rotated along its left.
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
