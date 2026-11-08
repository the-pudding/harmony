import type { Box, Point2D } from "./types.js";

export const boxesOverlap = (a: Box, b: Box): boolean =>
	a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

export const boxFitsWithin = (box: Box, width: number, height: number) =>
	box.left >= 0 && box.top >= 0 && box.right <= width && box.bottom <= height;

export const boxAround = (center: Point2D, radius: number): Box => ({
	left: center.x - radius,
	right: center.x + radius,
	top: center.y - radius,
	bottom: center.y + radius
});

export type MarkerLabelRequest<T> = {
	item: T;
	screen: Point2D;
	// The marker's radius; the label sits gap pixels past its edge.
	radius: number;
	textWidth: number;
	textHeight: number;
};

// Puts each label beside its marker: to the right if that's free, else
// left, above, or below. A spot is free when it covers no earlier label and
// no obstacle (the markers). One fully on the canvas is preferred, but one
// hanging off an edge still counts; a label with no free spot is dropped.
// Boxes include padding on every side.
export const placeMarkerLabels = <T>(
	requests: readonly MarkerLabelRequest<T>[],
	{
		obstacles,
		width,
		height,
		gap,
		padding
	}: {
		obstacles: readonly Box[];
		width: number;
		height: number;
		gap: number;
		padding: number;
	}
): { item: T; box: Box }[] => {
	const placed: { item: T; box: Box }[] = [];
	for (const { item, screen, radius, textWidth, textHeight } of requests) {
		const reach = radius + gap;
		const candidates: [number, number][] = [
			[screen.x + reach, screen.y - textHeight / 2],
			[screen.x - reach - textWidth, screen.y - textHeight / 2],
			[screen.x - textWidth / 2, screen.y - reach - textHeight],
			[screen.x - textWidth / 2, screen.y + reach]
		];
		const free = candidates
			.map(
				([left, top]): Box => ({
					left: left - padding,
					right: left + textWidth + padding,
					top: top - padding,
					bottom: top + textHeight + padding
				})
			)
			.filter(
				(box) =>
					!placed.some((other) => boxesOverlap(box, other.box)) &&
					!obstacles.some((other) => boxesOverlap(box, other))
			);
		const box =
			free.find((box) => boxFitsWithin(box, width, height)) ?? free[0];
		if (box) placed.push({ item, box });
	}
	return placed;
};

export type CenteredLabelRequest<T> = {
	item: T;
	text: string;
	// The label's center, in screen pixels.
	x: number;
	y: number;
};

// Places centered labels in order, skipping any that would fall off the
// canvas, overlap a label already placed, or repeat the text of a placed
// label within repeatDistance pixels.
export const placeCenteredLabels = <T>(
	requests: readonly CenteredLabelRequest<T>[],
	{
		measure,
		width,
		height,
		paddingX,
		paddingY,
		repeatDistance
	}: {
		measure: (text: string) => number;
		width: number;
		height: number;
		paddingX: number;
		paddingY: number;
		repeatDistance: number;
	}
): (CenteredLabelRequest<T> & { box: Box })[] => {
	const placed: (CenteredLabelRequest<T> & { box: Box })[] = [];
	for (const request of requests) {
		const { text, x, y } = request;
		if (
			placed.some(
				(other) =>
					other.text === text &&
					Math.hypot(other.x - x, other.y - y) < repeatDistance
			)
		) {
			continue;
		}
		const textWidth = measure(text);
		const box = {
			left: x - textWidth / 2 - paddingX,
			right: x + textWidth / 2 + paddingX,
			top: y - paddingY,
			bottom: y + paddingY
		};
		if (!boxFitsWithin(box, width, height)) continue;
		if (placed.some((other) => boxesOverlap(box, other.box))) continue;
		placed.push({ ...request, box });
	}
	return placed;
};
