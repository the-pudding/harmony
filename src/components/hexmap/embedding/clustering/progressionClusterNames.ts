// Names density clusters after the progression their songs are built on,
// for the story's HexMap.
//
// A cluster's songs each have a main progression; the cluster is named
// after the most common one. Clusters are hubs for a single progression, so:
//
// 1. Near-ties are dropped. When the runner-up is almost as common as the
//    top progression, the songs mix the two and no one progression leads.
// 2. Nearby clusters with the same name merge. DBSCAN often splits one
//    region into touching pieces; they're one thing on the map.
// 3. Far-apart clusters with the same name keep it, but only the largest is
//    labeled; the others are still colored.

import { hashSongKeys, type DensityCluster } from "./densityClusters.js";

export type NamedProgressionCluster = {
	cluster: DensityCluster;
	// The main progression, e.g. "doo wop".
	name: string;
	// Just that progression (a list so shading and search can sum shares).
	progressionNames: string[];
	// False for a far-away repeat of a larger cluster's name: it's still
	// colored, just not labeled.
	showLabel: boolean;
};

// A cluster is kept only when at least this share of its songs have the
// same main progression.
export const MIN_MAIN_PROGRESSION_SHARE = 0.25;

// A cluster is kept only when its top progression is at least this many
// times as common as the runner-up; otherwise it's a near-tie and dropped.
export const NEAR_TIE_RATIO = 1.5;

// Same-name clusters whose nearest songs are within this distance (on the
// normalized [0,1] map) merge into one. Measured: split pieces of one region
// sit 0.002–0.05 apart; genuinely separate same-name clusters 0.15+.
export const SAME_NAME_MERGE_GAP = 0.06;

type Position = { x: number; y: number };

type Draft = {
	cluster: DensityCluster;
	progressionNames: string[];
	showLabel: boolean;
};

// Each progression's share of the songs whose main progression it is,
// most common first (ties alphabetical).
const mainProgressionShares = (
	songKeys: readonly string[],
	mainProgressionBySongKey: ReadonlyMap<string, string>
): [string, number][] => {
	const counts = new Map<string, number>();
	for (const songKey of songKeys) {
		const name = mainProgressionBySongKey.get(songKey);
		if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
	}
	return [...counts]
		.map(([name, count]): [string, number] => [name, count / songKeys.length])
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
};

// Each progression's average share across the songs, biggest first (ties
// alphabetical).
const averageShares = (
	songKeys: readonly string[],
	songShares: ReadonlyMap<string, ReadonlyMap<string, number>>
): [string, number][] => {
	const sums = new Map<string, number>();
	for (const songKey of songKeys) {
		for (const [name, share] of songShares.get(songKey) ?? []) {
			sums.set(name, (sums.get(name) ?? 0) + share);
		}
	}
	return [...sums]
		.map(([name, sum]): [string, number] => [name, sum / songKeys.length])
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
};

const nameOf = (progressionNames: readonly string[]): string =>
	progressionNames[0];

// Distance between the closest pair of songs, one from each cluster.
const nearestGap = (
	first: readonly string[],
	second: readonly string[],
	positionBySongKey: ReadonlyMap<string, Position>
): number => {
	let best = Infinity;
	for (const firstKey of first) {
		const a = positionBySongKey.get(firstKey);
		if (!a) continue;
		for (const secondKey of second) {
			const b = positionBySongKey.get(secondKey);
			if (!b) continue;
			best = Math.min(best, Math.hypot(a.x - b.x, a.y - b.y));
		}
	}
	return best;
};

const mergeNearbySameName = (
	drafts: readonly Draft[],
	positionBySongKey: ReadonlyMap<string, Position>
): Draft[] => {
	const parent = drafts.map((_, index) => index);
	const root = (index: number): number =>
		parent[index] === index ? index : (parent[index] = root(parent[index]));

	drafts.forEach((first, i) => {
		drafts.forEach((second, j) => {
			if (j <= i) return;
			if (nameOf(first.progressionNames) !== nameOf(second.progressionNames))
				return;
			if (
				nearestGap(
					first.cluster.songKeys,
					second.cluster.songKeys,
					positionBySongKey
				) <= SAME_NAME_MERGE_GAP
			) {
				parent[root(j)] = root(i);
			}
		});
	});

	const groups = new Map<number, Draft[]>();
	drafts.forEach((draft, index) => {
		const key = root(index);
		groups.set(key, [...(groups.get(key) ?? []), draft]);
	});

	return [...groups.values()].map((group) => {
		if (group.length === 1) return group[0];
		const largest = [...group].sort(
			(a, b) => b.cluster.songKeys.length - a.cluster.songKeys.length
		)[0];
		const songKeys = group.flatMap((draft) => draft.cluster.songKeys);
		return {
			...largest,
			cluster: {
				id: largest.cluster.id,
				songKeys,
				hash: hashSongKeys(songKeys)
			}
		};
	});
};

// Only the largest cluster with each name is labeled.
const labelLargestOfEachName = (drafts: readonly Draft[]): Draft[] => {
	const largestByName = new Map<string, Draft>();
	for (const draft of [...drafts].sort(
		(a, b) => b.cluster.songKeys.length - a.cluster.songKeys.length
	)) {
		const name = nameOf(draft.progressionNames);
		if (!largestByName.has(name)) largestByName.set(name, draft);
	}
	return drafts.map((draft) =>
		largestByName.get(nameOf(draft.progressionNames)) === draft
			? draft
			: { ...draft, showLabel: false }
	);
};

export const nameProgressionClusters = (
	clusters: readonly DensityCluster[],
	mainProgressionBySongKey: ReadonlyMap<string, string>,
	positionBySongKey: ReadonlyMap<string, Position>,
	// The share a cluster's top progression needs, or a function giving it
	// per progression (e.g. stricter for unnamed ones).
	minProgressionShare: number | ((progressionName: string) => number),
	// When given (each song's share, 0–1, of each progression), a cluster's
	// progressions are ranked by their average share across its songs
	// instead of by how many songs have each as their main one.
	songShares?: ReadonlyMap<string, ReadonlyMap<string, number>>
): NamedProgressionCluster[] => {
	const drafts = clusters.flatMap((cluster): Draft[] => {
		const [top, runnerUp] = songShares
			? averageShares(cluster.songKeys, songShares)
			: mainProgressionShares(cluster.songKeys, mainProgressionBySongKey);
		if (!top) return [];
		const minShare =
			typeof minProgressionShare === "number"
				? minProgressionShare
				: minProgressionShare(top[0]);
		if (top[1] < minShare) return [];
		if (runnerUp !== undefined && top[1] < runnerUp[1] * NEAR_TIE_RATIO) {
			return [];
		}
		return [{ cluster, progressionNames: [top[0]], showLabel: true }];
	});

	return labelLargestOfEachName(mergeNearbySameName(drafts, positionBySongKey))
		.map(({ cluster, progressionNames, showLabel }) => ({
			cluster,
			name: nameOf(progressionNames),
			progressionNames,
			showLabel
		}))
		.sort((a, b) => b.cluster.songKeys.length - a.cluster.songKeys.length);
};
