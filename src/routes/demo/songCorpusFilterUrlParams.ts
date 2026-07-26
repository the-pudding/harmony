import { replaceState } from "$app/navigation";
import { page } from "$app/state";

export const SONG_CORPUS_URL_PARAM_POPULAR = "popular";
export const SONG_CORPUS_URL_PARAM_POPULAR_OFF_VALUE = "0";
export const SONG_CORPUS_URL_PARAM_MIN_SECTIONS = "minSections";
export const SONG_CORPUS_URL_PARAM_MIN_SECTIONS_VALUE = "2";

export const MIN_SECTIONS_FOR_MULTI_SECTION_FILTER = 2;
export const DEFAULT_SHOW_POPULAR_ONLY = true;
export const DEFAULT_REQUIRE_MULTIPLE_SECTIONS = false;

export type SongCorpusFilterUrlState = {
	showPopularOnly: boolean;
	requireMultipleSections: boolean;
};

export const readSongCorpusFilterUrlState = (
	searchParams: URLSearchParams
): SongCorpusFilterUrlState => ({
	showPopularOnly:
		searchParams.get(SONG_CORPUS_URL_PARAM_POPULAR) !==
		SONG_CORPUS_URL_PARAM_POPULAR_OFF_VALUE,
	requireMultipleSections:
		searchParams.get(SONG_CORPUS_URL_PARAM_MIN_SECTIONS) ===
		SONG_CORPUS_URL_PARAM_MIN_SECTIONS_VALUE
});

export const writeSongCorpusFilterUrlState = (
	params: URLSearchParams,
	state: SongCorpusFilterUrlState
): void => {
	if (state.showPopularOnly) {
		params.delete(SONG_CORPUS_URL_PARAM_POPULAR);
	} else {
		params.set(
			SONG_CORPUS_URL_PARAM_POPULAR,
			SONG_CORPUS_URL_PARAM_POPULAR_OFF_VALUE
		);
	}

	if (state.requireMultipleSections) {
		params.set(
			SONG_CORPUS_URL_PARAM_MIN_SECTIONS,
			SONG_CORPUS_URL_PARAM_MIN_SECTIONS_VALUE
		);
	} else {
		params.delete(SONG_CORPUS_URL_PARAM_MIN_SECTIONS);
	}
};

export const areSongCorpusFilterUrlStatesEqual = (
	first: SongCorpusFilterUrlState,
	second: SongCorpusFilterUrlState
): boolean =>
	first.showPopularOnly === second.showPopularOnly &&
	first.requireMultipleSections === second.requireMultipleSections;

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
