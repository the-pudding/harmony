import type { ScatterPoint } from "../../components/scatterPoint.js";
import type { ClusterPoint } from "./densityClusters.js";

const normalize = (value: number, min: number, max: number): number =>
	max === min ? 0.5 : (value - min) / (max - min);

export const buildClusterInputPoints = (
	points: readonly ScatterPoint[]
): ClusterPoint[] => {
	if (points.length === 0) return [];

	const bounds = points.reduce(
		(extent, point) => ({
			minX: Math.min(extent.minX, point.x),
			maxX: Math.max(extent.maxX, point.x),
			minY: Math.min(extent.minY, point.y),
			maxY: Math.max(extent.maxY, point.y)
		}),
		{
			minX: Infinity,
			maxX: -Infinity,
			minY: Infinity,
			maxY: -Infinity
		}
	);

	return points.map((point) => ({
		songKey: point.songKey,
		x: normalize(point.x, bounds.minX, bounds.maxX),
		y: normalize(point.y, bounds.minY, bounds.maxY)
	}));
};
