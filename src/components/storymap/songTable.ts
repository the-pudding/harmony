// Every song, once, by index. Columns are parallel arrays in the snapshot's
// order, so per-frame loops can run over plain arrays by integer index
// instead of looking songs up by key. Song keys only appear at the edges:
// copy, clicks and the player. Pure; built once per snapshot.
import type { HexMapSnapshot } from "$data/hexMapSnapshot.js";
import { decodeSnapshotCoverage } from "$data/hexMapClusters.js";
import {
	computeSongHomogeneity,
	type ProgressionCoverage,
	type SongHomogeneity
} from "$routes/demo/shared/progressionHomogeneity.js";

export type SongSummary = {
	title: string;
	artists: string[];
	year: number | undefined;
};

export type SongTable = {
	readonly count: number;
	readonly keys: readonly string[]; // index → songKey (snapshot order)
	readonly indexOf: ReadonlyMap<string, number>;
	// Calendar year, 0 when unknown.
	readonly year: Uint16Array;
	// Raw snapshot x/y, before the purity layout. Float64 (not Float32) so
	// the UMAP layout reproduces the old pipeline's numbers exactly.
	readonly umapX: Float64Array;
	readonly umapY: Float64Array;
	readonly title: readonly string[];
	readonly artists: readonly (readonly string[])[];
	// Derived once, used by layouts and the map.
	readonly coverage: readonly (readonly ProgressionCoverage[])[];
	readonly homogeneity: readonly (SongHomogeneity | null)[];
	// The named cluster each song is in (the last one, if it's in several),
	// or null.
	readonly clusterName: readonly (string | null)[];
	// The snapshot's clusters, largest first: each is its members' indexes.
	readonly clusterMembers: readonly (readonly number[])[];
	// The same data by song key, for the code that's keyed by song.
	readonly coverageBySongKey: ReadonlyMap<string, ProgressionCoverage[]>;
	readonly homogeneityBySongKey: ReadonlyMap<string, SongHomogeneity | null>;
	readonly songSummaryByKey: ReadonlyMap<string, SongSummary>;
};

export const buildSongTable = (snapshot: HexMapSnapshot): SongTable => {
	const count = snapshot.songKeys.length;
	const keys = snapshot.songKeys;
	const indexOf = new Map(keys.map((songKey, index) => [songKey, index]));

	const year = new Uint16Array(count);
	const umapX = new Float64Array(count);
	const umapY = new Float64Array(count);
	const coverage: ProgressionCoverage[][] = [];
	const homogeneity: (SongHomogeneity | null)[] = [];
	const coverageBySongKey = new Map<string, ProgressionCoverage[]>();
	const homogeneityBySongKey = new Map<string, SongHomogeneity | null>();
	const songSummaryByKey = new Map<string, SongSummary>();

	for (let index = 0; index < count; index++) {
		const songKey = keys[index];
		year[index] = snapshot.years?.[index] ?? 0;
		umapX[index] = snapshot.x[index];
		umapY[index] = snapshot.y[index];
		const songCoverage = decodeSnapshotCoverage(snapshot, index);
		const songHomogeneity = computeSongHomogeneity(songCoverage);
		coverage.push(songCoverage);
		homogeneity.push(songHomogeneity);
		coverageBySongKey.set(songKey, songCoverage);
		homogeneityBySongKey.set(songKey, songHomogeneity);
		songSummaryByKey.set(songKey, {
			title: snapshot.titles[index],
			artists: snapshot.artists[index],
			year: snapshot.years?.[index] || undefined
		});
	}

	const clusterName: (string | null)[] = new Array(count).fill(null);
	const clusterMembers = snapshot.clusters.map(({ name, songIndexes }) => {
		for (const index of songIndexes) clusterName[index] = name;
		return songIndexes;
	});

	return {
		count,
		keys,
		indexOf,
		year,
		umapX,
		umapY,
		title: snapshot.titles,
		artists: snapshot.artists,
		coverage,
		homogeneity,
		clusterName,
		clusterMembers,
		coverageBySongKey,
		homogeneityBySongKey,
		songSummaryByKey
	};
};
