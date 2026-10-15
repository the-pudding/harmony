import { applyHandReviewedCorrections } from "./applyHandReviewedCorrections.js";
import type { SongInput } from "../chord-processing/types.js";
import { groupSongs, type GroupedSong } from "./songBrowser.js";

export const ALL_SONGS_DATA_URL = "/data/songs.json";

export const fetchSongInputs = async (url: string): Promise<SongInput[]> => {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Could not load song dataset: HTTP ${response.status}`);
	}
	return applyHandReviewedCorrections(await response.json());
};

// Fetched and parsed once per page load and shared by every caller, since
// the file is ~50 MB. A failed load is forgotten so the next call retries.
let groupedAllSongsPromise: Promise<GroupedSong[]> | null = null;

export const fetchGroupedAllSongs = (): Promise<GroupedSong[]> => {
	groupedAllSongsPromise ??= fetchSongInputs(ALL_SONGS_DATA_URL)
		.then(groupSongs)
		.catch((error) => {
			groupedAllSongsPromise = null;
			throw error;
		});
	return groupedAllSongsPromise;
};

export const sortAllSongs = (songs: GroupedSong[]): GroupedSong[] =>
	[...songs].sort((a, b) => a.title.localeCompare(b.title));

export const findGroupedSongByKey = (
	songs: GroupedSong[],
	songKey: string
): GroupedSong | null => songs.find((song) => song.songKey === songKey) ?? null;

export const isGroupedSongKeyKnown = (
	songs: GroupedSong[],
	songKey: string
): boolean => songs.some((song) => song.songKey === songKey);
