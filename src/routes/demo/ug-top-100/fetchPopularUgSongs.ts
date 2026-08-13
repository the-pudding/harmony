import { fetchSongInputs } from "../../../data/songBrowserData.js";
import { groupSongs, type GroupedSong } from "../../../data/songBrowser.js";

export const POPULAR_UG_DATA_URL = "/data/popular-ug.json";

export const fetchPopularUgSongs = async (): Promise<GroupedSong[]> =>
	groupSongs(await fetchSongInputs(POPULAR_UG_DATA_URL));
