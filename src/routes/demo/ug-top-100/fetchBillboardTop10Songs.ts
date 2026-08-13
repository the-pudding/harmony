import { ALL_SONGS_DATA_URL, fetchSongInputs } from "../../../data/songBrowserData.js";
import { groupSongs, type GroupedSong } from "../../../data/songBrowser.js";

export const fetchBillboardTop10Songs = async (): Promise<GroupedSong[]> => {
	const allSongs = await fetchSongInputs(ALL_SONGS_DATA_URL);
	return groupSongs(allSongs.filter((song) => song.inTop10 === true));
};
