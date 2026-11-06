// The hex map's progression clusters, computed once by tasks/build-hexmap.ts
// from the snapshot's own (rounded) columns and stored in it, so HexMap and
// the Explore search read the same clusters without recomputing them.
import { buildClusterInputPoints } from "../components/hexmap/embedding/clustering/clusterInputPoints.js";
import {
	findDensityClusters,
	hashSongKeys,
	type DensityCluster
} from "../components/hexmap/embedding/clustering/densityClusters.js";
import {
	nameProgressionClusters,
	type NamedProgressionCluster
} from "../components/hexmap/embedding/clustering/progressionClusterNames.js";
import {
	computeSongHomogeneity,
	type ProgressionCoverage
} from "../routes/demo/shared/progressionHomogeneity.js";

export const HEX_MAP_CLUSTER_MIN_POINTS = 20;
export const HEX_MAP_CLUSTER_MAX_POINTS = 300;
export const HEX_MAP_CLUSTER_MIN_PROGRESSION_SHARE = 0.25;

export type SnapshotCluster = {
	name: string;
	progressionNames: string[];
	showLabel: boolean;
	// Indexes into the snapshot's song columns.
	songIndexes: number[];
};

type ClusterSource = {
	songKeys: string[];
	x: number[];
	y: number[];
	progressionNames: string[];
	progressions: number[][];
};

// Each song's progression coverage, decoded from the snapshot's columns.
export const decodeSnapshotCoverage = (
	snapshot: Pick<ClusterSource, "progressionNames" | "progressions">,
	index: number
): ProgressionCoverage[] => {
	const flat = snapshot.progressions[index];
	const entries: ProgressionCoverage[] = [];
	for (let at = 0; at < flat.length; at += 2) {
		entries.push({
			name: snapshot.progressionNames[flat[at]],
			coveragePercent: flat[at + 1]
		});
	}
	return entries;
};

export const computeHexMapClusters = (
	snapshot: ClusterSource
): SnapshotCluster[] => {
	const clusterPoints = buildClusterInputPoints(
		snapshot.songKeys.map((songKey, index) => ({
			songKey,
			x: snapshot.x[index],
			y: snapshot.y[index],
			groupShares: [],
			homogeneityColor: ""
		}))
	);
	const mainProgressionBySongKey = new Map<string, string>();
	snapshot.songKeys.forEach((songKey, index) => {
		const homogeneity = computeSongHomogeneity(
			decodeSnapshotCoverage(snapshot, index)
		);
		if (homogeneity)
			mainProgressionBySongKey.set(songKey, homogeneity.dominantProgressionName);
	});
	const indexBySongKey = new Map(
		snapshot.songKeys.map((songKey, index) => [songKey, index])
	);
	return nameProgressionClusters(
		findDensityClusters(
			clusterPoints,
			HEX_MAP_CLUSTER_MIN_POINTS,
			HEX_MAP_CLUSTER_MAX_POINTS
		),
		mainProgressionBySongKey,
		new Map(clusterPoints.map((point) => [point.songKey, point])),
		HEX_MAP_CLUSTER_MIN_PROGRESSION_SHARE
	).map(({ cluster, name, progressionNames, showLabel }) => ({
		name,
		progressionNames,
		showLabel,
		songIndexes: cluster.songKeys.map((songKey) => indexBySongKey.get(songKey)!)
	}));
};

// Back to the shape the scatter draws, in the snapshot's stored order.
export const namedClustersFromSnapshot = (snapshot: {
	songKeys: string[];
	clusters: SnapshotCluster[];
}): NamedProgressionCluster[] =>
	snapshot.clusters.map(({ name, progressionNames, showLabel, songIndexes }, id) => {
		const songKeys = songIndexes.map((index) => snapshot.songKeys[index]);
		const cluster: DensityCluster = { id, songKeys, hash: hashSongKeys(songKeys) };
		return { cluster, name, progressionNames, showLabel };
	});
