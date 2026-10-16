// Names density clusters after the progression their songs are built on,
// for pages that label clusters by progression (/demo/embedding, HexMap).
//
// A cluster's songs each have a main progression; the cluster is named
// after the most common one. Three adjustments keep names honest:
//
// 1. Near-ties get both names. When the runner-up is almost as common as
//    the top progression, the cluster is a real group of songs that mix the
//    two, so it's named "top · runner-up" (and gets a color of its own).
// 2. Nearby clusters with the same name merge. DBSCAN often splits one
//    region into touching pieces; they're one thing on the map.
// 3. Far-apart clusters with the same name are told apart. The largest
//    keeps the plain name; each other one is named for the progression that
//    sets it apart from the largest, or left unlabeled when none does.

import { hashSongKeys, type DensityCluster } from "./densityClusters.js";

export type NamedProgressionCluster = {
	cluster: DensityCluster;
	// "doo wop", or "doo wop · V-I-vi-IV" for a near-tie.
	name: string;
	// The progressions in the name, top first. Shading sums their shares.
	progressionNames: string[];
	// False for a far-away repeat of a larger cluster's name that nothing
	// sets apart: it's still colored, just not labeled.
	showLabel: boolean;
};

// A cluster is kept only when at least this share of its songs have the
// same main progression.
export const MIN_MAIN_PROGRESSION_SHARE = 0.25;

// A cluster names only its top progression when that progression is at
// least this many times as common as the runner-up; otherwise it's a
// near-tie and names both.
export const NEAR_TIE_RATIO = 1.5;

// Same-name clusters whose nearest songs are within this distance (on the
// normalized [0,1] map) merge into one. Measured: split pieces of one region
// sit 0.002–0.05 apart; genuinely separate same-name clusters 0.15+.
export const SAME_NAME_MERGE_GAP = 0.06;

// A far-away repeat is renamed after a progression only when that
// progression is the main one for at least this share of its songs (and
// more so than in the largest same-name cluster).
export const DISTINCTIVE_MIN_SHARE = 0.15;

export const PROGRESSION_NAME_SEPARATOR = " · ";

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

const nameOf = (progressionNames: readonly string[]): string =>
	progressionNames.join(PROGRESSION_NAME_SEPARATOR);

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

// The progression that sets `cluster` apart from `reference`: the biggest
// gain in main-progression share, if it's common enough to name.
const distinctiveProgression = (
	cluster: Draft,
	reference: Draft,
	mainProgressionBySongKey: ReadonlyMap<string, string>
): string | null => {
	const referenceShares = new Map(
		mainProgressionShares(reference.cluster.songKeys, mainProgressionBySongKey)
	);
	const [best] = mainProgressionShares(
		cluster.cluster.songKeys,
		mainProgressionBySongKey
	)
		.filter(
			([name, share]) =>
				!cluster.progressionNames.includes(name) &&
				share >= DISTINCTIVE_MIN_SHARE &&
				share > (referenceShares.get(name) ?? 0)
		)
		.map(([name, share]): [string, number] => [
			name,
			share - (referenceShares.get(name) ?? 0)
		])
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
	return best?.[0] ?? null;
};

const distinguishFarRepeats = (
	drafts: readonly Draft[],
	mainProgressionBySongKey: ReadonlyMap<string, string>
): Draft[] => {
	const largestByName = new Map<string, Draft>();
	for (const draft of [...drafts].sort(
		(a, b) => b.cluster.songKeys.length - a.cluster.songKeys.length
	)) {
		const name = nameOf(draft.progressionNames);
		if (!largestByName.has(name)) largestByName.set(name, draft);
	}

	const taken = new Set(largestByName.keys());
	return drafts.map((draft) => {
		const reference = largestByName.get(nameOf(draft.progressionNames))!;
		if (reference === draft) return draft;
		const distinctive = distinctiveProgression(
			draft,
			reference,
			mainProgressionBySongKey
		);
		const renamed =
			distinctive === null ? null : [...draft.progressionNames, distinctive];
		if (renamed === null || taken.has(nameOf(renamed)))
			return { ...draft, showLabel: false };
		taken.add(nameOf(renamed));
		return { ...draft, progressionNames: renamed };
	});
};

export const nameProgressionClusters = (
	clusters: readonly DensityCluster[],
	mainProgressionBySongKey: ReadonlyMap<string, string>,
	positionBySongKey: ReadonlyMap<string, Position>,
	minProgressionShare: number
): NamedProgressionCluster[] => {
	const drafts = clusters.flatMap((cluster): Draft[] => {
		const [top, runnerUp] = mainProgressionShares(
			cluster.songKeys,
			mainProgressionBySongKey
		);
		if (!top || top[1] < minProgressionShare) return [];
		const isNearTie =
			runnerUp !== undefined && top[1] < runnerUp[1] * NEAR_TIE_RATIO;
		return [
			{
				cluster,
				progressionNames: isNearTie ? [top[0], runnerUp[0]] : [top[0]],
				showLabel: true
			}
		];
	});

	return distinguishFarRepeats(
		mergeNearbySameName(drafts, positionBySongKey),
		mainProgressionBySongKey
	)
		.map(({ cluster, progressionNames, showLabel }) => ({
			cluster,
			name: nameOf(progressionNames),
			progressionNames,
			showLabel
		}))
		.sort((a, b) => b.cluster.songKeys.length - a.cluster.songKeys.length);
};
