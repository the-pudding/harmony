// Rows of src/data/synced-songs/reference.csv: which cluster each synced
// song is featured in, its trimmed region, and whether it shows in the app.
// Within a cluster, row order is the order the songs play in. Rows are
// grouped by cluster, clusters alphabetical.

export type SyncedSongReferenceRow = {
	cluster: string;
	songKey: string;
	startSeconds: number;
	endSeconds: number;
	// Shown on the map, in search and in the cluster's player.
	visible: boolean;
};

export const REFERENCE_COLUMNS: (keyof SyncedSongReferenceRow)[] = [
	"cluster",
	"songKey",
	"startSeconds",
	"endSeconds",
	"visible"
];

type RawReferenceRow = Partial<Record<string, string | number | boolean>>;

// Rows from before the visible column count as visible.
export const parseReferenceRows = (
	raw: readonly RawReferenceRow[]
): SyncedSongReferenceRow[] =>
	raw.map((row) => ({
		cluster: String(row.cluster ?? ""),
		songKey: String(row.songKey ?? ""),
		startSeconds: Number(row.startSeconds),
		endSeconds: Number(row.endSeconds),
		visible: String(row.visible ?? "true").trim().toLowerCase() !== "false"
	}));

// Groups rows by cluster, alphabetically, keeping each cluster's order.
export const sortByCluster = (
	rows: SyncedSongReferenceRow[]
): SyncedSongReferenceRow[] =>
	[...rows].sort((a, b) => a.cluster.localeCompare(b.cluster));

// Saving a song: updates its row where it is, keeping its place and
// visibility, or, if it's new or changed cluster, adds it visible at the
// end of its cluster.
export const upsertReferenceRow = (
	rows: SyncedSongReferenceRow[],
	row: Omit<SyncedSongReferenceRow, "visible">
): SyncedSongReferenceRow[] => {
	const existing = rows.find((other) => other.songKey === row.songKey);
	if (existing && existing.cluster === row.cluster) {
		return rows.map((other) =>
			other === existing ? { ...row, visible: existing.visible } : other
		);
	}
	return sortByCluster([
		...rows.filter((other) => other.songKey !== row.songKey),
		{ ...row, visible: true }
	]);
};

export type FeaturedSongSetting = { songKey: string; visible: boolean };

// Sets one cluster's play order and visibility. `songs` must list exactly
// the cluster's songs; returns null otherwise (the file changed since the
// page loaded).
export const reorderClusterRows = (
	rows: SyncedSongReferenceRow[],
	cluster: string,
	songs: FeaturedSongSetting[]
): SyncedSongReferenceRow[] | null => {
	const clusterRows = rows.filter((row) => row.cluster === cluster);
	const rowBySongKey = new Map(clusterRows.map((row) => [row.songKey, row]));
	const listed = new Set(songs.map((song) => song.songKey));
	if (
		listed.size !== songs.length ||
		listed.size !== rowBySongKey.size ||
		songs.some((song) => !rowBySongKey.has(song.songKey))
	) {
		return null;
	}
	return sortByCluster([
		...rows.filter((row) => row.cluster !== cluster),
		...songs.map((song) => ({
			...rowBySongKey.get(song.songKey)!,
			visible: song.visible
		}))
	]);
};
