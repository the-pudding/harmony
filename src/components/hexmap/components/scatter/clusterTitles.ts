// Where each cluster's title (name over chords) goes at dot zoom: centered
// under its outline, biggest clusters first, skipping any that would run
// into one already placed. One cluster (the one the user picked) can be
// "merged": its full-size player stands in for its title, so its spot is
// returned separately and its bigger box is kept clear.
import { CLUSTER_LABEL_GAP } from "./constants.js";
import { normalizeName } from "./clusterNames.js";
import type { ClusterHit } from "./types.js";

export type ClusterTitleSpot = {
	hash: string;
	name: string;
	// Top center of the title, in the scatter's pixels.
	x: number;
	y: number;
	songCount: number;
};

type Box = { left: number; top: number; right: number; bottom: number };

// Rough title sizes, since titles are placed before they're rendered:
// small ones are ClusterTitle at 0.45 scale, the merged one full size with
// arrows. Overestimates a little so neighbors don't touch.
const SMALL_CHAR_WIDTH = 7.5;
const SMALL_MIN_WIDTH = 120;
const SMALL_HEIGHT = 56;
const FULL_CHAR_WIDTH = 16;
const FULL_ARROWS_WIDTH = 120;
const FULL_MIN_WIDTH = 280;
const FULL_HEIGHT = 130;
const TITLE_PADDING = 8;

// Each named cluster's title spot, just under the lowest point of its
// (possibly rotated) outline.
export const clusterTitleSpots = (
	hits: readonly ClusterHit[],
	names: ReadonlyMap<string, string>
): ClusterTitleSpot[] =>
	hits.flatMap(({ cluster, geometry }) => {
		const name = names.get(cluster.hash);
		if (!name) return [];
		const { centroid, semiAxisX, semiAxisY, rotationRadians } = geometry;
		const halfHeight = Math.hypot(
			semiAxisX * Math.sin(rotationRadians),
			semiAxisY * Math.cos(rotationRadians)
		);
		return [
			{
				hash: cluster.hash,
				name,
				x: centroid.x,
				y: centroid.y + halfHeight + CLUSTER_LABEL_GAP,
				songCount: cluster.songKeys.length
			}
		];
	});

const boxFor = (spot: ClusterTitleSpot, full: boolean): Box => {
	const width = full
		? Math.max(
				spot.name.length * FULL_CHAR_WIDTH + FULL_ARROWS_WIDTH,
				FULL_MIN_WIDTH
			)
		: Math.max(spot.name.length * SMALL_CHAR_WIDTH, SMALL_MIN_WIDTH);
	return {
		left: spot.x - width / 2 - TITLE_PADDING,
		right: spot.x + width / 2 + TITLE_PADDING,
		top: spot.y - TITLE_PADDING,
		bottom: spot.y + (full ? FULL_HEIGHT : SMALL_HEIGHT) + TITLE_PADDING
	};
};

const overlaps = (a: Box, b: Box) =>
	a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

export const placeClusterTitles = (
	spots: readonly ClusterTitleSpot[],
	{
		width,
		height,
		mergedName = null,
		bottom = height
	}: {
		width: number;
		height: number;
		mergedName?: string | null;
		// Small titles must end above this, e.g. where a panel covers the map.
		bottom?: number;
	}
): { titles: ClusterTitleSpot[]; merged: ClusterTitleSpot | null } => {
	const inView = (spot: ClusterTitleSpot) =>
		spot.x >= 0 && spot.x <= width && spot.y >= 0 && spot.y <= height;
	const bySize = [...spots].sort((a, b) => b.songCount - a.songCount);
	const mergedKey = mergedName === null ? null : normalizeName(mergedName);
	const isMerged = (spot: ClusterTitleSpot) =>
		mergedKey !== null && normalizeName(spot.name) === mergedKey;

	// Clusters can repeat a name; the biggest is the one picked.
	const mergedSpot = bySize.find(isMerged) ?? null;
	const merged = mergedSpot && inView(mergedSpot) ? mergedSpot : null;
	const placedBoxes: Box[] = merged ? [boxFor(merged, true)] : [];

	const titles: ClusterTitleSpot[] = [];
	for (const spot of bySize) {
		if (isMerged(spot) || !inView(spot)) continue;
		const box = boxFor(spot, false);
		if (box.bottom > bottom) continue;
		if (placedBoxes.some((placed) => overlaps(placed, box))) continue;
		placedBoxes.push(box);
		titles.push(spot);
	}
	return { titles, merged };
};
