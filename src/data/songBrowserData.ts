import { applyHandReviewedCorrections } from "./applyHandReviewedCorrections.js";
import type { SongInput } from "../chord-processing/types.js";
import { groupSongs, type GroupedSong } from "./songBrowser.js";

export const RECENT_SONGS_DATA_URL = "/data/recent-songs.json";
export const ALL_SONGS_DATA_URL = "/data/songs.json";

export const fetchSongInputs = async (url: string): Promise<SongInput[]> => {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Could not load song dataset: HTTP ${response.status}`);
	}
	return applyHandReviewedCorrections(await response.json());
};

export const fetchGroupedRecentSongs = async (): Promise<GroupedSong[]> =>
	groupSongs(await fetchSongInputs(RECENT_SONGS_DATA_URL));

export const fetchGroupedAllSongs = async (): Promise<GroupedSong[]> =>
	groupSongs(await fetchSongInputs(ALL_SONGS_DATA_URL));

export const sortRecentSongs = (songs: GroupedSong[]): GroupedSong[] =>
	[...songs].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

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
