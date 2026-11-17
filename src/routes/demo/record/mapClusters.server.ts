import fs from "fs";
import path from "path";
import { normalizeClusterName } from "$data/clusterName.js";
import type { HexMapSnapshot } from "$data/hexMapSnapshot.js";

export type MapCluster = {
	name: string;
	// The progressions it's named for (one, or several for a merged name).
	progressionNames: string[];
	songCount: number;
};

const HEX_MAP_PATH = path.join(process.cwd(), "static", "data", "hexmap.json");

let cachedHexMap: HexMapSnapshot | null = null;

// static/data/hexmap.json, read once per server process.
export const readHexMap = (): HexMapSnapshot =>
	(cachedHexMap ??= JSON.parse(
		fs.readFileSync(HEX_MAP_PATH, "utf8")
	) as HexMapSnapshot);

let cachedClusters: MapCluster[] | null = null;

// The clusters the map draws, one per name (far-away repeats of a name are
// one cluster to reference.csv, which matches by name), biggest first.
// These are the clusters a synced song can join.
export const loadMapClusters = (): MapCluster[] => {
	if (cachedClusters) return cachedClusters;
	const byName = new Map<string, MapCluster>();
	for (const cluster of readHexMap().clusters) {
		const key = normalizeClusterName(cluster.name);
		const existing = byName.get(key);
		if (existing) {
			existing.songCount += cluster.songIndexes.length;
			continue;
		}
		byName.set(key, {
			name: cluster.name,
			progressionNames: cluster.progressionNames,
			songCount: cluster.songIndexes.length
		});
	}
	cachedClusters = [...byName.values()].sort(
		(a, b) => b.songCount - a.songCount
	);
	return cachedClusters;
};

export const loadMapClusterNames = (): string[] =>
	loadMapClusters().map((cluster) => cluster.name);
