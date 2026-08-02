import { replaceState } from "$app/navigation";
import { page } from "$app/state";

export const ARTISTS_PAGE_PATH = "/demo/artists";
export const ARTISTS_PAGE_ARTIST_PARAM = "artist";

export const buildArtistsPageUrl = (artistName: string): string =>
	`${ARTISTS_PAGE_PATH}?${ARTISTS_PAGE_ARTIST_PARAM}=${encodeURIComponent(artistName)}`;

export const readFocusedArtistFromUrl = (
	searchParams: URLSearchParams
): string | null => searchParams.get(ARTISTS_PAGE_ARTIST_PARAM);

export const replaceFocusedArtistInUrl = (artistName: string | null): void => {
	if (artistName === readFocusedArtistFromUrl(page.url.searchParams)) return;

	const params = new URLSearchParams(page.url.searchParams);
	if (artistName === null) params.delete(ARTISTS_PAGE_ARTIST_PARAM);
	else params.set(ARTISTS_PAGE_ARTIST_PARAM, artistName);

	const queryString = params.toString();
	replaceState(
		queryString ? `${page.url.pathname}?${queryString}` : page.url.pathname,
		page.state
	);
};
