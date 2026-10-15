// Everything HexMap needs that doesn't depend on its props or the screen:
// each song's UMAP position and progression coverage, plus enough to name it
// in a tooltip. Built by tasks/build-hexmap.ts (npm run hexmap) so the story
// pages never load songs.json or run coverage and UMAP in the browser.
// Stored as parallel columns, which keeps the JSON small.
import type { SongInput } from "../chord-processing/types.js";
import { groupSongs, type GroupedSong } from "./songBrowser.js";

export const HEX_MAP_SNAPSHOT_URL = "/data/hexmap.json";

export type HexMapSnapshot = {
	songKeys: string[];
	titles: string[];
	artists: string[][];
	x: number[];
	y: number[];
	// Names indexed by the progression columns below.
	progressionNames: string[];
	// Per song, flattened [nameIndex, coveragePercent, nameIndex, ...].
	progressions: number[][];
};

// The full chord data for each song lives in small shards so a song tooltip
// can load just the one it needs.
export const SONG_SHARD_COUNT = 256;

export const songShardUrl = (shard: number): string =>
	`/data/song-shards/${shard}.json`;

// FNV-1a over the song key; stable across the build task and the browser.
export const songShardFor = (songKey: string): number => {
	let hash = 0x811c9dc5;
	for (let index = 0; index < songKey.length; index++) {
		hash ^= songKey.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0) % SONG_SHARD_COUNT;
};

const shardPromises = new Map<number, Promise<Map<string, GroupedSong>>>();

// The song with this key, with its chords, fetching its shard the first time
// any song in it is asked for. Null when the song isn't in the shard.
export const loadShardedSong = async (
	songKey: string
): Promise<GroupedSong | null> => {
	const shard = songShardFor(songKey);
	let songs = shardPromises.get(shard);
	if (!songs) {
		songs = fetch(songShardUrl(shard))
			.then((response) => {
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				return response.json() as Promise<SongInput[]>;
			})
			.then(
				(inputs) =>
					new Map(groupSongs(inputs).map((song) => [song.songKey, song]))
			);
		songs.catch(() => shardPromises.delete(shard));
		shardPromises.set(shard, songs);
	}
	return (await songs).get(songKey) ?? null;
};

let snapshotPromise: Promise<HexMapSnapshot> | null = null;

// Fetched once and shared by every HexMap on the page.
export const loadHexMapSnapshot = (): Promise<HexMapSnapshot> => {
	snapshotPromise ??= fetch(HEX_MAP_SNAPSHOT_URL)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`Could not load hex map: HTTP ${response.status}`);
			}
			return response.json() as Promise<HexMapSnapshot>;
		})
		.catch((error) => {
			snapshotPromise = null;
			throw error;
		});
	return snapshotPromise;
};
