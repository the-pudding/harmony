import type { ScatterPoint } from "../scatterPoint.js";
import { JITTER_AMPLITUDE } from "./constants.js";
import type { NormalizedPoint, Position } from "./types.js";

// Stable per-song offset so songs sharing an identical vector stay pickable.
export const jitterFor = (songKey: string): Position => {
	const hash = [...songKey].reduce(
		(accumulator, character) =>
			(accumulator * 31 + character.charCodeAt(0)) % 100003,
		7
	);
	return {
		nx: ((hash % 101) / 100 - 0.5) * JITTER_AMPLITUDE * 2,
		ny: (((hash / 101) % 101) / 100 - 0.5) * JITTER_AMPLITUDE * 2
	};
};

const normalize = (value: number, min: number, max: number): number =>
	max === min ? 0.5 : (value - min) / (max - min);

// Scales every point into 0–1 across the bounds of all of them, plus each
// song's jitter.
export const normalizePoints = (
	points: readonly ScatterPoint[]
): NormalizedPoint[] => {
	if (points.length === 0) return [];
	const bounds = points.reduce(
		(extent, point) => ({
			minX: Math.min(extent.minX, point.x),
			maxX: Math.max(extent.maxX, point.x),
			minY: Math.min(extent.minY, point.y),
			maxY: Math.max(extent.maxY, point.y)
		}),
		{ minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
	);
	return points.map((point) => {
		const jitter = jitterFor(point.songKey);
		return {
			...point,
			nx: normalize(point.x, bounds.minX, bounds.maxX) + jitter.nx,
			ny: normalize(point.y, bounds.minY, bounds.maxY) + jitter.ny
		};
	});
};
