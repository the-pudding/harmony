import {
	fitClusterEllipse2D,
	type ClusterEllipse2D
} from "../harmony-map/embedding/clustering/clusterBounds.js";
import type { DensityCluster } from "../harmony-map/embedding/clustering/densityClusters.js";
import type { EmbeddingPoint } from "./embeddingWorldPoints.js";

export type NamedClusterOutline = {
	name: string;
	ellipse: ClusterEllipse2D;
};

// Fits an outline around every density cluster that resolved to a name (no
// cap — every named cluster gets one, matching /demo/harmony-map), using
// each member's actual on-screen (world-space) position rather than the
// normalized [0,1] coordinates clustering ran on.
export const computeNamedClusterOutlines = (
	clusters: readonly DensityCluster[],
	nameByHash: ReadonlyMap<string, string>,
	worldPoints: readonly EmbeddingPoint[],
	padding: number
): NamedClusterOutline[] => {
	const worldPositionBySongKey = new Map(worldPoints.map((p) => [p.songKey, p]));
	const outlines: NamedClusterOutline[] = [];
	for (const cluster of clusters) {
		const name = nameByHash.get(cluster.hash);
		if (!name) continue;
		const points = cluster.songKeys
			.map((key) => worldPositionBySongKey.get(key))
			.filter((p): p is EmbeddingPoint => p !== undefined)
			.map((p) => ({ x: p.x, y: p.y }));
		const ellipse = fitClusterEllipse2D(points, padding);
		if (ellipse) outlines.push({ name, ellipse });
	}
	return outlines;
};
