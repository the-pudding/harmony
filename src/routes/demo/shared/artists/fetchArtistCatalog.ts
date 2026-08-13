import { fetchSongInputs } from "../../../../data/songBrowserData.js";
import { groupSongs, type GroupedSong } from "../../../../data/songBrowser.js";

export const artistCatalogDataUrl = (slug: string): string =>
	`/data/artists/${slug}.json`;

export const fetchArtistCatalogSongs = async (
	slug: string
): Promise<GroupedSong[]> =>
	groupSongs(await fetchSongInputs(artistCatalogDataUrl(slug)));
