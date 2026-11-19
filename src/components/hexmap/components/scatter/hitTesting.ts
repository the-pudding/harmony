import type { ZoomTransform } from "d3";
import { pointInsideClusterEllipse2D } from "../../embedding/clustering/clusterBounds.js";
import { axialForPoint, hexKey } from "../../embedding/layout/hexBins.js";
import type { HexLayout } from "./paint/hexLayout.js";
import type { ClusterHit, Point2D } from "./types.js";
import { screenX, screenY, type ScreenProjection } from "./viewport.js";

// The song nearest the anchor among these, if any is closer than
// maxDistance pixels.
export const nearestSongAt = (
	anchor: Point2D,
	songKeys: Iterable<string>,
	screenOf: (songKey: string) => Point2D | null,
	maxDistance: number
): string | null => {
	let hit: string | null = null;
	let hitDistance = maxDistance;
	for (const songKey of songKeys) {
		const screen = screenOf(songKey);
		if (!screen) continue;
		const distance = Math.hypot(screen.x - anchor.x, screen.y - anchor.y);
		if (distance < hitDistance) {
			hit = songKey;
			hitDistance = distance;
		}
	}
	return hit;
};

// nearestSongAt over songs by index, for scans over every song: the index
// among these nearest the anchor, if any drawn one (alpha above 0) is
// closer than maxDistance pixels, else -1.
export const nearestIndexAt = (
	anchor: Point2D,
	indexes: ArrayLike<number>,
	{
		x,
		y,
		alpha,
		projection
	}: {
		x: Float32Array;
		y: Float32Array;
		alpha: Float32Array;
		projection: ScreenProjection;
	},
	maxDistance: number
): number => {
	let hit = -1;
	let hitDistance = maxDistance;
	for (let n = 0; n < indexes.length; n++) {
		const index = indexes[n];
		if (!(alpha[index] > 0)) continue;
		const distance = Math.hypot(
			screenX(projection, x[index]) - anchor.x,
			screenY(projection, y[index]) - anchor.y
		);
		if (distance < hitDistance) {
			hit = index;
			hitDistance = distance;
		}
	}
	return hit;
};

// The smallest cluster outline containing the anchor, so nested clusters
// stay reachable.
export const clusterAt = (
	anchor: Point2D,
	hits: readonly ClusterHit[]
): ClusterHit | null => {
	const area = ({ geometry }: ClusterHit) =>
		geometry.semiAxisX * geometry.semiAxisY;
	return hits.reduce<ClusterHit | null>((best, hit) => {
		if (!pointInsideClusterEllipse2D(anchor, hit.geometry)) return best;
		return !best || area(hit) < area(best) ? hit : best;
	}, null);
};

// The key of the occupied hex under the anchor, or null.
export const hexKeyAt = (
	anchor: Point2D,
	transform: ZoomTransform,
	layout: Pick<HexLayout, "radius" | "bins">
): string | null => {
	const [baseX, baseY] = transform.invert([anchor.x, anchor.y]);
	const { q, r } = axialForPoint(baseX, baseY, layout.radius);
	const key = hexKey(q, r);
	return layout.bins.has(key) ? key : null;
};
