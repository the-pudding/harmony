// What picking a cluster on the map does to the story: which cluster opens
// in the panel and which sample (if any) starts playing. Kept pure so every
// branch can be tested; explore.svelte.ts applies the result.
import {
	featuredClusterOf,
	featuredSongsOf,
	hasFeaturedSongs
} from "$data/featuredClusters.js";

export type ClusterPick = {
	// The cluster name the map reported (a hex, a title, or a dot's), or
	// null for the background, a gray hex or an unclustered dot.
	clusterName: string | null;
	// The song clicked, if the pick came from a dot.
	songKey: string | null;
	// On the explore slide every cluster opens the panel, and stray clicks
	// leave it up; elsewhere only clusters with samples open it.
	exploreSlide: boolean;
};

export type PickResult =
	| { kind: "keep" }
	| {
			kind: "set";
			clusterName: string | undefined;
			playingSongKey: string | undefined;
	  };

export const resolveClusterPick = ({
	clusterName,
	songKey,
	exploreSlide
}: ClusterPick): PickResult => {
	const sampleCluster = featuredClusterOf(songKey);
	if (exploreSlide && clusterName === null && sampleCluster === undefined) {
		return { kind: "keep" };
	}

	// Clusters with samples go by reference.csv's spelling, which the
	// player looks its songs up by.
	const featuredName =
		sampleCluster ??
		(hasFeaturedSongs(clusterName)
			? featuredSongsOf(clusterName)[0].cluster
			: undefined);
	const openedName =
		featuredName ?? (exploreSlide ? (clusterName ?? undefined) : undefined);

	let playingSongKey: string | undefined;
	if (sampleCluster !== undefined) {
		playingSongKey = songKey ?? undefined; // a sample's own dot
	} else if (songKey === null && featuredName !== undefined) {
		playingSongKey = featuredSongsOf(featuredName)[0].songKey; // hex or title
	}
	// A plain dot opens its own chords instead, so the samples wait.

	return { kind: "set", clusterName: openedName, playingSongKey };
};
