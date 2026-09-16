import type { DensityCluster } from "./densityClusters.js";

// Which named-cluster anchors should currently show their ring/label on the
// map. An anchor only reads as highlighted while at least one cluster it
// belongs to is visible — deselecting a cluster hides its anchor's
// highlight along with the outline, same as any other dot. An anchor with
// no cluster membership at all (shouldn't normally happen, but density
// clusters can drift) has nothing to key off, so it instead follows
// "deselect all": once every current cluster is hidden — whether via the
// "deselect all" button or by toggling each one off individually — it
// hides too; as soon as any cluster is visible again, it's back.
export const computeVisibleAnchorSongKeys = (
	anchorSongKeys: ReadonlySet<string>,
	clusters: readonly DensityCluster[],
	hiddenClusterHashes: ReadonlySet<string>
): Set<string> => {
	const clusterHashesBySongKey = new Map<string, string[]>();
	for (const cluster of clusters) {
		for (const songKey of cluster.songKeys) {
			const hashes = clusterHashesBySongKey.get(songKey);
			if (hashes) hashes.push(cluster.hash);
			else clusterHashesBySongKey.set(songKey, [cluster.hash]);
		}
	}

	const allClustersHidden =
		clusters.length > 0 &&
		clusters.every((cluster) => hiddenClusterHashes.has(cluster.hash));

	return new Set(
		[...anchorSongKeys].filter((songKey) => {
			const hashes = clusterHashesBySongKey.get(songKey);
			if (!hashes) return !allClustersHidden;
			return hashes.some((hash) => !hiddenClusterHashes.has(hash));
		})
	);
};
