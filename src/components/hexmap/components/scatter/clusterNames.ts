import type { DensityCluster } from "../../embedding/clustering/densityClusters.js";

import { normalizeClusterName } from "$data/clusterName.js";

// Names compare trimmed and case-insensitively (see clusterName.ts).
export const normalizeName = normalizeClusterName;

// The biggest cluster with this name, or undefined if there's none.
export const findNamedCluster = (
	clusters: readonly DensityCluster[],
	names: ReadonlyMap<string, string>,
	clusterName: string
): DensityCluster | undefined => {
	const target = normalizeName(clusterName);
	return clusters
		.filter((candidate) => {
			const name = names.get(candidate.hash);
			return name !== undefined && normalizeName(name) === target;
		})
		.sort((a, b) => b.songKeys.length - a.songKeys.length)[0];
};
