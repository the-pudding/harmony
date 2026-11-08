import {
	HEX_LABEL_EXTRA_PADDING_UNTIL_ZOOM,
	HEX_LABEL_EXTRA_PADDING_ZOOMED_OUT,
	HEX_LABEL_FONT,
	HEX_LABEL_PADDING_X,
	HEX_LABEL_PADDING_Y,
	HEX_LABEL_REPEAT_DISTANCE_PX,
	MIN_ZOOM
} from "../constants.js";
import { placeCenteredLabels } from "../labelPlacement.js";
import type { LabelSpot } from "../types.js";
import { fromBasePixel } from "../viewport.js";
import type { HexLayout } from "./hexLayout.js";
import type { Scene } from "./scene.js";

// Extra space around labels when fully zoomed out, where they'd otherwise
// crowd, easing away by HEX_LABEL_EXTRA_PADDING_UNTIL_ZOOM.
const extraLabelPadding = (zoom: number): number =>
	HEX_LABEL_EXTRA_PADDING_ZOOMED_OUT *
	Math.max(
		0,
		1 - (zoom - MIN_ZOOM) / (HEX_LABEL_EXTRA_PADDING_UNTIL_ZOOM - MIN_ZOOM)
	);

// One label per cluster, at its biggest patch (regions come largest first;
// if that one doesn't fit, the cluster goes unlabeled rather than
// labeling a stray patch), skipping any that would collide with a label
// already placed, fall off screen, or that allowedNames leaves out. Draws
// them when draw is set. Returns every label that fit, placed like song
// positions, so rotating labels can pick from them.
export const drawHexRegionLabels = (
	scene: Scene,
	{
		layout,
		draw,
		isAllowed
	}: {
		layout: HexLayout;
		draw: boolean;
		isAllowed: (name: string) => boolean;
	}
): LabelSpot[] => {
	const { context, viewport, themeColors } = scene;
	const { transform } = viewport;
	context.font = HEX_LABEL_FONT;
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.lineJoin = "round";

	const consideredRegionIds = new Set<string>();
	const requests = layout.labelRegions.flatMap((region) => {
		if (consideredRegionIds.has(region.name)) return [];
		consideredRegionIds.add(region.name);
		const text = layout.nameByRegionId.get(region.name);
		if (text === undefined || !isAllowed(text)) return [];
		return [
			{
				item: region,
				text,
				x: transform.applyX(region.x),
				y: transform.applyY(region.y)
			}
		];
	});

	const extraPadding = extraLabelPadding(transform.k);
	const placed = placeCenteredLabels(requests, {
		measure: (text) => context.measureText(text).width,
		width: viewport.width,
		height: viewport.height,
		paddingX: HEX_LABEL_PADDING_X + extraPadding,
		paddingY: HEX_LABEL_PADDING_Y + extraPadding,
		repeatDistance: HEX_LABEL_REPEAT_DISTANCE_PX
	});

	if (draw) {
		for (const { text, x, y } of placed) {
			context.strokeStyle = themeColors.labelHalo;
			context.lineWidth = 3;
			context.strokeText(text, x, y);
			context.fillStyle = themeColors.labelText;
			context.fillText(text, x, y);
		}
	}

	// Stored like song positions (0–1 across the plot), so a label already
	// showing stays put on the map when the plot resizes.
	return placed.map(({ text, item }) => ({
		text,
		...fromBasePixel(viewport, item)
	}));
};
