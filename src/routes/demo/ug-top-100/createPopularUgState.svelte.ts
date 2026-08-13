import { onMount } from "svelte";
import type { GroupedSong } from "../../../data/songBrowser.js";
import {
	computeSongCoverage,
	type SongCoverageEntry
} from "../define-chord-progression/compute-coverage-of-all-songs/computeSongCoverage.js";
import { toSongStat, type ArtistSongStat } from "../shared/artists/artistStats.js";
import { fetchPopularUgSongs } from "./fetchPopularUgSongs.js";

export const createPopularUgState = () => {
	let songs = $state<ArtistSongStat[]>([]);
	let songByKey = $state<Map<string, GroupedSong>>(new Map());
	let coverageEntries = $state<SongCoverageEntry[]>([]);
	let groupedSongs = $state<GroupedSong[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(() => {
		fetchPopularUgSongs()
			.then((fetchedSongs) => {
				groupedSongs = fetchedSongs;
				const byKey = new Map(fetchedSongs.map((song) => [song.songKey, song]));
				songByKey = byKey;
				const entries = fetchedSongs.map(computeSongCoverage);
				coverageEntries = entries;
				songs = entries.map((entry) => toSongStat(entry, byKey));
			})
			.catch((err) => {
				error = err instanceof Error ? err.message : "Failed to load songs";
			})
			.finally(() => {
				loading = false;
			});
	});

	return {
		get songs() {
			return songs;
		},
		get songByKey() {
			return songByKey;
		},
		get coverageEntries() {
			return coverageEntries;
		},
		get groupedSongs() {
			return groupedSongs;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		}
	};
};
