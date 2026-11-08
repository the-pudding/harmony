import { zoomIdentity, type ZoomTransform } from "d3";
import {
	CLUSTER_FOCUS_PADDING,
	FRAME_FOCUS_FILL,
	HEX_FOCUS_SCALE,
	MAX_CLUSTER_FOCUS_SCALE,
	MAX_ZOOM,
	MIN_ZOOM,
	PAN_EDGE_PADDING,
	PLOT_MARGIN
} from "./constants.js";
import type {
	FocusFrame,
	Point2D,
	Position,
	ViewSize,
	Viewport
} from "./types.js";

// The plotted area inside the margins, in pixels.
export const plotSize = ({
	width,
	height
}: Pick<ViewSize, "width" | "height">): { width: number; height: number } => ({
	width: Math.max(0, width - PLOT_MARGIN * 2),
	height: Math.max(0, height - PLOT_MARGIN * 2)
});

// A position in base (unzoomed) pixels.
export const toBasePixel = (
	size: Pick<ViewSize, "width" | "height">,
	position: Position
): Point2D => {
	const plot = plotSize(size);
	return {
		x: PLOT_MARGIN + position.nx * plot.width,
		y: PLOT_MARGIN + (1 - position.ny) * plot.height
	};
};

// The inverse of toBasePixel.
export const fromBasePixel = (
	size: Pick<ViewSize, "width" | "height">,
	base: Point2D
): Position => {
	const plot = plotSize(size);
	return {
		nx: (base.x - PLOT_MARGIN) / Math.max(plot.width, 1),
		ny: 1 - (base.y - PLOT_MARGIN) / Math.max(plot.height, 1)
	};
};

export const toScreen = (viewport: Viewport, position: Position): Point2D => {
	const base = toBasePixel(viewport, position);
	return {
		x: viewport.transform.applyX(base.x),
		y: viewport.transform.applyY(base.y)
	};
};

// Whether a screen point is on the canvas, or within margin pixels of it.
export const isOnScreen = (
	{ width, height }: Pick<ViewSize, "width" | "height">,
	screen: Point2D,
	margin = 0
): boolean =>
	screen.x >= -margin &&
	screen.y >= -margin &&
	screen.x <= width + margin &&
	screen.y <= height + margin;

// The full, unzoomed view, shifted down by offsetY.
export const homeTransform = (offsetY: number): ZoomTransform =>
	zoomIdentity.translate(0, offsetY);

// A view at this scale with base centered on the canvas (below offsetY).
export const transformCenteredOn = (
	{ width, height, offsetY }: ViewSize,
	base: Point2D,
	scale: number
): ZoomTransform =>
	zoomIdentity
		.scale(scale)
		.translate(
			width / (2 * scale) - base.x,
			(height / 2 + offsetY) / scale - base.y
		);

// A view at this scale with base centered across the canvas and in the
// middle of frame vertically.
export const transformCenteredInFrame = (
	width: number,
	frame: FocusFrame,
	base: Point2D,
	scale: number
): ZoomTransform =>
	zoomIdentity
		.translate(
			width / 2 - base.x * scale,
			frame.top + frame.height / 2 - base.y * scale
		)
		.scale(scale);

// Keeps the plot (its full unzoomed frame, margins included) from being
// panned off screen: each edge can come at most PAN_EDGE_PADDING past the
// matching viewport edge, and the top edge is measured from offsetY down
// (below any text over the map). The padding lets clusters near the edge
// get roughly centered. Used for user gestures and scripted targets alike.
export const constrainTransform = (
	{ width, height, offsetY }: ViewSize,
	t: ZoomTransform
): ZoomTransform => {
	const clamp = (value: number, a: number, b: number) =>
		Math.min(Math.max(value, Math.min(a, b)), Math.max(a, b));
	const pad = PAN_EDGE_PADDING;
	const x = clamp(t.x, width - t.k * width - pad, pad);
	const y = clamp(t.y, height - t.k * height - pad, offsetY + pad);
	return x === t.x && y === t.y ? t : zoomIdentity.translate(x, y).scale(t.k);
};

// Fits a set of base pixels (a cluster's songs) to the view. In hex mode
// with a focusFrame, the box nearly fills the frame but zooms at least to
// dot zoom; in hex mode without one, it zooms just to dot zoom; otherwise
// it fits the viewport with padding. Null when there are no points.
export const clusterFocusTransform = (
	size: ViewSize,
	basePoints: readonly Point2D[],
	{ hexMode, focusFrame }: { hexMode: boolean; focusFrame: FocusFrame | null }
): ZoomTransform | null => {
	if (basePoints.length === 0) return null;
	const minX = Math.min(...basePoints.map((point) => point.x));
	const maxX = Math.max(...basePoints.map((point) => point.x));
	const minY = Math.min(...basePoints.map((point) => point.y));
	const maxY = Math.max(...basePoints.map((point) => point.y));
	const boxWidth = Math.max(maxX - minX, 1);
	const boxHeight = Math.max(maxY - minY, 1);
	const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

	if (hexMode && focusFrame && focusFrame.height > 0) {
		// Capped by width too, so a wide cluster doesn't spill off the sides.
		// Never below dot zoom, so a big cluster still shows as dots even if
		// it then overflows the frame.
		const frameScale = Math.min(
			Math.max(
				Math.min(
					(focusFrame.height * FRAME_FOCUS_FILL) / boxHeight,
					(size.width * FRAME_FOCUS_FILL) / boxWidth
				),
				HEX_FOCUS_SCALE
			),
			MAX_ZOOM
		);
		return transformCenteredInFrame(size.width, focusFrame, center, frameScale);
	}
	const fitScale = Math.min(
		(size.width * CLUSTER_FOCUS_PADDING) / boxWidth,
		(size.height * CLUSTER_FOCUS_PADDING) / boxHeight
	);
	const scale = hexMode
		? HEX_FOCUS_SCALE
		: Math.min(Math.max(fitScale, MIN_ZOOM), MAX_CLUSTER_FOCUS_SCALE);
	return transformCenteredOn(size, center, scale);
};
