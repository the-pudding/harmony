// Rearranges each cluster so a song's distance from the cluster's center is
// set by how pure it is: the purest songs sit in the middle and the most
// mixed songs on the rim.
//
// - Center: the average position of the cluster's members.
// - Distance: songs are ranked by purity (purest first; ties keep their
//   original distance order) and the k-th of n goes to radius
//   R * sqrt((k + 0.5) / n). The square root fills the disk evenly, so equal
//   areas hold equal numbers of songs. R is 1.5 × the members' mean distance
//   from the center, which keeps the cluster's footprint about the same size
//   (a uniformly filled disk has mean distance 2/3 R).
// - Direction: mixed songs keep their original direction from the center,
//   so a song still leans toward the side of whatever else it plays. Songs
//   at or above pureThreshold have nothing else to lean toward, and UMAP
//   packs them into one tight knot with a single shared direction, so they
//   are fanned out evenly instead (golden-angle spiral).
//
// Songs outside every cluster are returned unchanged. Distance within a
// cluster encodes purity rank, not absolute purity.

export type RadialLayoutPoint = { songKey: string; x: number; y: number };

export type RadialLayoutCluster = { songKeys: readonly string[] };

export type PurityRadialLayoutOptions = {
	pureThreshold: number;
};

const FOOTPRINT_SCALE = 1.5;
const MIN_CLUSTER_SIZE = 3;
const GOLDEN_ANGLE_RADIANS = Math.PI * (3 - Math.sqrt(5));

export const applyPurityRadialLayout = <Point extends RadialLayoutPoint>(
	points: readonly Point[],
	clusters: readonly RadialLayoutCluster[],
	purityBySongKey: ReadonlyMap<string, number>,
	{ pureThreshold }: PurityRadialLayoutOptions
): Point[] => {
	const pointBySongKey = new Map(points.map((point) => [point.songKey, point]));
	const moved = new Map<string, { x: number; y: number }>();

	for (const cluster of clusters) {
		const members = cluster.songKeys.flatMap((songKey) => {
			const point = pointBySongKey.get(songKey);
			return point ? [point] : [];
		});
		if (members.length < MIN_CLUSTER_SIZE) continue;

		const centerX =
			members.reduce((sum, point) => sum + point.x, 0) / members.length;
		const centerY =
			members.reduce((sum, point) => sum + point.y, 0) / members.length;

		const ranked = members
			.map((point) => ({
				point,
				purity: purityBySongKey.get(point.songKey) ?? 0,
				distance: Math.hypot(point.x - centerX, point.y - centerY),
				angle: Math.atan2(point.y - centerY, point.x - centerX)
			}))
			.sort(
				(first, second) =>
					second.purity - first.purity ||
					first.distance - second.distance ||
					first.point.songKey.localeCompare(second.point.songKey)
			);

		const meanDistance =
			ranked.reduce((sum, entry) => sum + entry.distance, 0) / ranked.length;
		const radius = meanDistance * FOOTPRINT_SCALE;

		ranked.forEach((entry, rank) => {
			const distance = radius * Math.sqrt((rank + 0.5) / ranked.length);
			const angle =
				entry.purity >= pureThreshold
					? rank * GOLDEN_ANGLE_RADIANS
					: entry.angle;
			moved.set(entry.point.songKey, {
				x: centerX + distance * Math.cos(angle),
				y: centerY + distance * Math.sin(angle)
			});
		});
	}

	return points.map((point) => {
		const position = moved.get(point.songKey);
		return position ? { ...point, ...position } : point;
	});
};
