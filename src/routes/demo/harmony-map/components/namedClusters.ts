import { namedClusters } from "$data/named-clusters.js";
import type { DensityCluster } from "../embedding/clustering/densityClusters.js";

// A cluster is defined by containing its anchor song, not by its exact
// membership — so a named cluster survives points drifting in and out
// as long as the one song it's anchored to is still grouped there.
export type NamedCluster = { anchorSongKey: string; name: string };

// src/data/named-clusters.ts is the sole source of truth — edit it directly
// (and commit) to name, rename, or re-anchor a cluster. There's no in-app
// editing: this module only reads the committed file.
export const getNamedClusters = (): NamedCluster[] => namedClusters;

export const findNamedClusterFor = (
	cluster: DensityCluster,
	entries: readonly NamedCluster[] = namedClusters
): NamedCluster | null => {
	const memberSet = new Set(cluster.songKeys);
	return entries.find((entry) => memberSet.has(entry.anchorSongKey)) ?? null;
};

export const resolveClusterNames = (
	clusters: readonly DensityCluster[],
	entries: readonly NamedCluster[] = namedClusters
): Map<string, string> => {
	const result = new Map<string, string>();
	for (const cluster of clusters) {
		const match = findNamedClusterFor(cluster, entries);
		if (match) result.set(cluster.hash, match.name);
	}
	return result;
};

// Every anchor song across all named clusters. These are the songs shown
// highlighted (ring + label) on the map — a highlight now exists purely to
// show which song defines a named cluster, so it's fully derived from the
// committed file rather than a separate user-toggled selection.
export const namedClusterAnchorSongKeys: Set<string> = new Set(
	namedClusters.map((entry) => entry.anchorSongKey)
);
