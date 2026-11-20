// Ripple from one song: each song's stagger (0–1) is its distance from the
// origin over the farthest song's, or the reverse for "farthestFirst".
import type { SongTable } from "./songTable.js";
import type { LayoutFrame, LayoutResult } from "./layouts/types.js";

export type RippleOrder = "closestFirst" | "farthestFirst";

// Distances are in frame px for a framed layout, else in layout units. Songs
// the layout doesn't place, and all songs when the origin isn't placed, get 0.
export const revealStagger = (
	table: SongTable,
	layout: LayoutResult,
	originIndex: number,
	{
		frame = null,
		order = "closestFirst"
	}: { frame?: LayoutFrame | null; order?: RippleOrder } = {}
): Float32Array => {
	const stagger = new Float32Array(table.count);
	const { x, y } = layout;
	const originX = x[originIndex];
	const originY = y[originIndex];
	if (Number.isNaN(originX) || Number.isNaN(originY)) return stagger;
	const scaleX = layout.framed && frame ? frame.width : 1;
	const scaleY = layout.framed && frame ? frame.height : 1;

	let farthest = 0;
	for (let index = 0; index < table.count; index++) {
		const dx = (x[index] - originX) * scaleX;
		const dy = (y[index] - originY) * scaleY;
		const distance = Math.sqrt(dx * dx + dy * dy);
		if (Number.isNaN(distance)) continue;
		stagger[index] = distance;
		if (distance > farthest) farthest = distance;
	}
	if (farthest === 0) return stagger.fill(0);

	for (let index = 0; index < table.count; index++) {
		const normalized = stagger[index] / farthest;
		stagger[index] =
			order === "closestFirst" ||
			Number.isNaN(x[index]) ||
			Number.isNaN(y[index])
				? normalized
				: 1 - normalized;
	}
	return stagger;
};
