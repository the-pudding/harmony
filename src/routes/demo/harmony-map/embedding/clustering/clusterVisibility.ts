import type { DensityCluster } from "./densityClusters.js";

// % of currently-released songs (see the year scrubber in EmbeddingView) that
// belong to each cluster — independent of cluster geometry, which stays
// fixed at its final-state shape regardless of scrub position. Passing
// `releasedSongKeys: null` means "everything released" (scrubber at the end,
// or not in use), in which case every cluster's share is just its final
// share of the whole visible corpus.
export const computeClusterVisibleShares = (
	clusters: readonly DensityCluster[],
	releasedSongKeys: ReadonlySet<string> | null,
	totalReleasedCount: number
): Map<string, number> => {
	const shares = new Map<string, number>();
	if (totalReleasedCount <= 0) return shares;

	for (const cluster of clusters) {
		const visibleCount =
			releasedSongKeys === null
				? cluster.songKeys.length
				: cluster.songKeys.filter((songKey) => releasedSongKeys.has(songKey)).length;
		shares.set(cluster.hash, (visibleCount / totalReleasedCount) * 100);
	}

	return shares;
};
