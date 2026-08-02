import { replaceState } from "$app/navigation";
import { page } from "$app/state";

export const SONG_CORPUS_URL_PARAM_RECENT = "recent";
export const SONG_CORPUS_URL_PARAM_RECENT_OFF_VALUE = "0";

export const DEFAULT_SHOW_RECENT_ONLY = true;

export type SongCorpusFilterUrlState = {
	showRecentOnly: boolean;
};

export const readSongCorpusFilterUrlState = (
	searchParams: URLSearchParams
): SongCorpusFilterUrlState => ({
	showRecentOnly:
		searchParams.get(SONG_CORPUS_URL_PARAM_RECENT) !==
		SONG_CORPUS_URL_PARAM_RECENT_OFF_VALUE
});

export const writeSongCorpusFilterUrlState = (
	params: URLSearchParams,
	state: SongCorpusFilterUrlState
): void => {
	if (state.showRecentOnly) {
		params.delete(SONG_CORPUS_URL_PARAM_RECENT);
	} else {
		params.set(
			SONG_CORPUS_URL_PARAM_RECENT,
			SONG_CORPUS_URL_PARAM_RECENT_OFF_VALUE
		);
	}
};

export const areSongCorpusFilterUrlStatesEqual = (
	first: SongCorpusFilterUrlState,
	second: SongCorpusFilterUrlState
): boolean => first.showRecentOnly === second.showRecentOnly;

export const replaceSongCorpusFilterInUrl = (
	state: SongCorpusFilterUrlState
): void => {
	const currentUrlState = readSongCorpusFilterUrlState(page.url.searchParams);
	if (areSongCorpusFilterUrlStatesEqual(state, currentUrlState)) return;

	const params = new URLSearchParams(page.url.searchParams);
	writeSongCorpusFilterUrlState(params, state);
	const queryString = params.toString();
	const nextUrl = queryString
		? `${page.url.pathname}?${queryString}`
		: page.url.pathname;
	replaceState(nextUrl, page.state);
};
