// The featured (sample) songs from reference.csv, by cluster name
// (matched as in clusterName.ts).
import { normalizeClusterName } from "./clusterName.js";
import { featuredSyncedSongs } from "./syncedSongs.js";
import type { SyncedSongReferenceRow } from "./syncedSongReference.js";

const featuredSongsByName = new Map<string, SyncedSongReferenceRow[]>();
for (const row of featuredSyncedSongs) {
	const key = normalizeClusterName(row.cluster);
	featuredSongsByName.set(key, [...(featuredSongsByName.get(key) ?? []), row]);
}

const clusterByFeaturedSongKey = new Map(
	featuredSyncedSongs.map((row) => [row.songKey, row.cluster])
);

export const featuredSongKeys: Set<string> = new Set(
	clusterByFeaturedSongKey.keys()
);

// A cluster's featured songs, in play order (none for most clusters).
export const featuredSongsOf = (
	clusterName: string | null | undefined
): SyncedSongReferenceRow[] =>
	clusterName == null
		? []
		: (featuredSongsByName.get(normalizeClusterName(clusterName)) ?? []);

export const hasFeaturedSongs = (clusterName: string | null | undefined) =>
	featuredSongsOf(clusterName).length > 0;

// The cluster a featured song belongs to, as reference.csv spells it.
export const featuredClusterOf = (
	songKey: string | null | undefined
): string | undefined =>
	songKey == null ? undefined : clusterByFeaturedSongKey.get(songKey);
