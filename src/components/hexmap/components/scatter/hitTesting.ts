import type { ZoomTransform } from "d3";
import { pointInsideClusterEllipse2D } from "../../embedding/clustering/clusterBounds.js";
import { axialForPoint, hexKey } from "../../embedding/layout/hexBins.js";
import { OUTLINED_LABEL_LINE_HEIGHT } from "./constants.js";
import type { OutlinedLabelHitArea } from "./paint/outlinedLabels.js";
import type { HexLayout } from "./paint/hexLayout.js";
import type { ClusterHit, Point2D } from "./types.js";

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

// The outlined song whose label is under the anchor, or null. While a song
// plays, only its label counts. The hovered label's hint row (one line
// below it, as wide as its hint) counts as part of it.
export const labelSongKeyAt = (
	anchor: Point2D,
	hitAreas: ReadonlyMap<string, OutlinedLabelHitArea>,
	{
		playingSongKey,
		hoveredLabelSongKey
	}: { playingSongKey: string | null; hoveredLabelSongKey: string | null }
): string | null => {
	for (const [songKey, { box, hintRight }] of hitAreas) {
		if (playingSongKey !== null && songKey !== playingSongKey) continue;
		const hovered = songKey === hoveredLabelSongKey;
		const right = hovered ? Math.max(box.right, hintRight) : box.right;
		const bottom = hovered
			? box.bottom + OUTLINED_LABEL_LINE_HEIGHT
			: box.bottom;
		if (
			anchor.x >= box.left &&
			anchor.x <= right &&
			anchor.y >= box.top &&
			anchor.y <= bottom
		) {
			return songKey;
		}
	}
	return null;
};
