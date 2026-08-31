import type { DensityCluster } from "../embedding/clustering/densityClusters.js";

// A cluster is defined by containing its anchor song, not by its exact
// membership — so a named cluster survives points drifting in and out
// as long as the one song it's anchored to is still grouped there.
export type NamedCluster = { anchorSongKey: string; name: string };

const CLUSTER_NAMES_STORAGE_KEY = "harmony-map-cluster-names-v2";

const loadNamedClusters = (): NamedCluster[] => {
	if (typeof localStorage === "undefined") return [];
	try {
		const raw = localStorage.getItem(CLUSTER_NAMES_STORAGE_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? (parsed as NamedCluster[]) : [];
	} catch {
		return [];
	}
};

let namedClusters = $state<NamedCluster[]>(loadNamedClusters());

export const getNamedClusters = (): NamedCluster[] => namedClusters;

const persistNamedClusters = (next: NamedCluster[]) => {
	namedClusters = next;
	if (typeof localStorage !== "undefined") {
		localStorage.setItem(CLUSTER_NAMES_STORAGE_KEY, JSON.stringify(next));
	}
};

export const findNamedClusterFor = (
	cluster: DensityCluster,
	entries: readonly NamedCluster[] = namedClusters
): NamedCluster | null => {
	const memberSet = new Set(cluster.songKeys);
	return entries.find((entry) => memberSet.has(entry.anchorSongKey)) ?? null;
};

export const setClusterName = (anchorSongKey: string, name: string) => {
	const survivors = namedClusters.filter(
		(entry) => entry.anchorSongKey !== anchorSongKey
	);
	persistNamedClusters(
		name ? [...survivors, { anchorSongKey, name }] : survivors
	);
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
