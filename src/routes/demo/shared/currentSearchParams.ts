import { browser } from "$app/environment";
import { page } from "$app/state";

const EMPTY_SEARCH_PARAMS = new URLSearchParams();

/** Prerendering forbids reading search params, so server renders see defaults. */
export const currentSearchParams = (): URLSearchParams =>
	browser ? page.url.searchParams : EMPTY_SEARCH_PARAMS;
