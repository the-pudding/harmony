import { namedClusters as committedNamedClusters } from "$data/named-clusters.js";
import type { DensityCluster } from "../embedding/clustering/densityClusters.js";

// A cluster is defined by containing its anchor song, not by its exact
// membership — so a named cluster survives points drifting in and out
// as long as the one song it's anchored to is still grouped there.
export type NamedCluster = { anchorSongKey: string; name: string };

// Source of truth is the committed src/data/named-clusters.ts file, so
// everyone who loads the app sees the same names. The naming input on the
// map still works for live preview within a session (setClusterName below),
// but that edit isn't written back to disk — land it in named-clusters.ts by
// hand to make it permanent for everyone.
let namedClusters = $state<NamedCluster[]>([...committedNamedClusters]);

export const getNamedClusters = (): NamedCluster[] => namedClusters;

export const findNamedClusterFor = (
	cluster: DensityCluster,
	entries: readonly NamedCluster[] = namedClusters
): NamedCluster | null => {
	const memberSet = new Set(cluster.songKeys);
	return entries.find((entry) => memberSet.has(entry.anchorSongKey)) ?? null;
};

// Drops any entry sharing either the new anchor or the new name before
// adding the replacement, so re-anchoring a cluster (naming it from a newly
// highlighted song) overwrites its one entry instead of leaving the old
// anchor behind as an orphaned duplicate with the same name.
export const setClusterName = (anchorSongKey: string, name: string) => {
	const survivors = namedClusters.filter(
		(entry) => entry.anchorSongKey !== anchorSongKey && entry.name !== name
	);
	namedClusters = name ? [...survivors, { anchorSongKey, name }] : survivors;
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
