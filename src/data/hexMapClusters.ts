// The hex map's progression clusters, computed once by tasks/build-hexmap.ts
// from the snapshot's own (rounded) columns and stored in it, so HexMap and
// the Explore search read the same clusters without recomputing them.
import coreProgressions from "./core-progressions.js";
import { normalizeClusterName } from "./clusterName.js";
import { buildClusterInputPoints } from "../components/hexmap/embedding/clustering/clusterInputPoints.js";
import {
	estimateEps,
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

export const HEX_MAP_CLUSTER_MIN_POINTS = 15;
export const HEX_MAP_CLUSTER_MAX_POINTS = 300;
// The share of a cluster's songs that must have its top progression as
// their main one: a named progression's hub, or a stricter bar for one
// known only by its chords ("V-vi-V"), so those only show when they're
// clear-cut.
export const HEX_MAP_CLUSTER_MIN_PROGRESSION_SHARE = 0.25;
export const HEX_MAP_CLUSTER_MIN_UNNAMED_PROGRESSION_SHARE = 0.3;

const namedProgressions = new Set(
	coreProgressions.map(({ name }) => normalizeClusterName(name))
);

export const minProgressionShareFor = (progressionName: string): number =>
	namedProgressions.has(normalizeClusterName(progressionName))
		? HEX_MAP_CLUSTER_MIN_PROGRESSION_SHARE
		: HEX_MAP_CLUSTER_MIN_UNNAMED_PROGRESSION_SHARE;

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

// How a cluster's progression is scored: "vote" counts songs whose main
// progression it is; "share" averages how much of each song it covers.
export type ClusterPurity = "vote" | "share";

export type HexMapClusterOptions = {
	purity: ClusterPurity;
	minProgressionShareFor: (progressionName: string) => number;
	// A gray song joins a cluster named for its main progression when it's
	// within this many clustering radii of one of its songs (repeating, so
	// a trail of such songs can join). 0 turns this off.
	attachRadiusEps: number;
};

export const HEX_MAP_CLUSTER_OPTIONS: HexMapClusterOptions = {
	purity: "vote",
	minProgressionShareFor,
	attachRadiusEps: 2
};

// Gray songs join the nearest same-name cluster within `radius`, over and
// over until none can (each joined song lets the ones near it join next).
const attachGraySongs = (
	clusters: { name: string; songKeys: string[] }[],
	mainProgressionBySongKey: ReadonlyMap<string, string>,
	positionBySongKey: ReadonlyMap<string, { x: number; y: number }>,
	radius: number
) => {
	const clustered = new Set(clusters.flatMap((cluster) => cluster.songKeys));
	let gray = [...positionBySongKey.keys()].filter(
		(songKey) =>
			!clustered.has(songKey) && mainProgressionBySongKey.has(songKey)
	);
	for (let joined = true; joined; ) {
		joined = false;
		const stillGray: string[] = [];
		for (const songKey of gray) {
			const main = normalizeClusterName(mainProgressionBySongKey.get(songKey)!);
			const at = positionBySongKey.get(songKey)!;
			let best: {
				cluster: (typeof clusters)[number];
				distance: number;
			} | null = null;
			for (const cluster of clusters) {
				if (normalizeClusterName(cluster.name) !== main) continue;
				for (const member of cluster.songKeys) {
					const point = positionBySongKey.get(member)!;
					const distance = Math.hypot(point.x - at.x, point.y - at.y);
					if (distance <= radius && (!best || distance < best.distance)) {
						best = { cluster, distance };
					}
				}
			}
			if (best) {
				best.cluster.songKeys.push(songKey);
				joined = true;
			} else stillGray.push(songKey);
		}
		gray = stillGray;
	}
};

export const computeHexMapClusters = (
	snapshot: ClusterSource,
	options: HexMapClusterOptions = HEX_MAP_CLUSTER_OPTIONS
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
			mainProgressionBySongKey.set(
				songKey,
				homogeneity.dominantProgressionName
			);
	});
	const indexBySongKey = new Map(
		snapshot.songKeys.map((songKey, index) => [songKey, index])
	);
	const songShares =
		options.purity === "share"
			? new Map(
					snapshot.songKeys.map((songKey, index) => [
						songKey,
						new Map(
							decodeSnapshotCoverage(snapshot, index).map(
								({ name, coveragePercent }) => [name, coveragePercent / 100]
							)
						)
					])
				)
			: undefined;
	const positionBySongKey = new Map(
		clusterPoints.map((point) => [point.songKey, point])
	);
	const named = nameProgressionClusters(
		findDensityClusters(
			clusterPoints,
			HEX_MAP_CLUSTER_MIN_POINTS,
			HEX_MAP_CLUSTER_MAX_POINTS
		),
		mainProgressionBySongKey,
		positionBySongKey,
		options.minProgressionShareFor,
		songShares
	).map((entry) => ({ ...entry, songKeys: [...entry.cluster.songKeys] }));
	if (options.attachRadiusEps > 0) {
		attachGraySongs(
			named,
			mainProgressionBySongKey,
			positionBySongKey,
			options.attachRadiusEps *
				estimateEps(clusterPoints, HEX_MAP_CLUSTER_MIN_POINTS)
		);
	}
	return named.map(({ name, progressionNames, showLabel, songKeys }) => ({
		name,
		progressionNames,
		showLabel,
		songIndexes: songKeys.map((songKey) => indexBySongKey.get(songKey)!)
	}));
};

// Back to the shape the scatter draws, in the snapshot's stored order.
export const namedClustersFromSnapshot = (snapshot: {
	songKeys: string[];
	clusters: SnapshotCluster[];
}): NamedProgressionCluster[] =>
	snapshot.clusters.map(
		({ name, progressionNames, showLabel, songIndexes }, id) => {
			const songKeys = songIndexes.map((index) => snapshot.songKeys[index]);
			const cluster: DensityCluster = {
				id,
				songKeys,
				hash: hashSongKeys(songKeys)
			};
			return { cluster, name, progressionNames, showLabel };
		}
	);
