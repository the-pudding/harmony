import { describe, expect, it } from "vitest";
import {
	DEFAULT_REQUIRE_MULTIPLE_SECTIONS,
	DEFAULT_SHOW_POPULAR_ONLY,
	readSongCorpusFilterUrlState,
	SONG_CORPUS_URL_PARAM_MIN_SECTIONS,
	SONG_CORPUS_URL_PARAM_MIN_SECTIONS_VALUE,
	SONG_CORPUS_URL_PARAM_POPULAR,
	SONG_CORPUS_URL_PARAM_POPULAR_OFF_VALUE,
	writeSongCorpusFilterUrlState
} from "./songCorpusFilterUrlParams.js";

describe("songCorpusFilterUrlParams", () => {
	it("reads defaults when params are absent", () => {
		expect(readSongCorpusFilterUrlState(new URLSearchParams())).toEqual({
			showPopularOnly: DEFAULT_SHOW_POPULAR_ONLY,
			requireMultipleSections: DEFAULT_REQUIRE_MULTIPLE_SECTIONS
		});
	});

	it("reads non-default toggle values from params", () => {
		const params = new URLSearchParams({
			[SONG_CORPUS_URL_PARAM_POPULAR]: SONG_CORPUS_URL_PARAM_POPULAR_OFF_VALUE,
			[SONG_CORPUS_URL_PARAM_MIN_SECTIONS]:
				SONG_CORPUS_URL_PARAM_MIN_SECTIONS_VALUE
		});

		expect(readSongCorpusFilterUrlState(params)).toEqual({
			showPopularOnly: false,
			requireMultipleSections: true
		});
	});

	it("writes only non-default params and preserves other keys", () => {
		const params = new URLSearchParams({ song: "abc", songsContext: "1" });
		writeSongCorpusFilterUrlState(params, {
			showPopularOnly: false,
			requireMultipleSections: true
		});

		expect(params.get("song")).toBe("abc");
		expect(params.get("songsContext")).toBe("1");
		expect(params.get(SONG_CORPUS_URL_PARAM_POPULAR)).toBe(
			SONG_CORPUS_URL_PARAM_POPULAR_OFF_VALUE
		);
		expect(params.get(SONG_CORPUS_URL_PARAM_MIN_SECTIONS)).toBe(
			SONG_CORPUS_URL_PARAM_MIN_SECTIONS_VALUE
		);
	});

	it("deletes params when returning to defaults", () => {
		const params = new URLSearchParams({
			[SONG_CORPUS_URL_PARAM_POPULAR]: SONG_CORPUS_URL_PARAM_POPULAR_OFF_VALUE,
			[SONG_CORPUS_URL_PARAM_MIN_SECTIONS]:
				SONG_CORPUS_URL_PARAM_MIN_SECTIONS_VALUE
		});
		writeSongCorpusFilterUrlState(params, {
			showPopularOnly: true,
			requireMultipleSections: false
		});

		expect(params.has(SONG_CORPUS_URL_PARAM_POPULAR)).toBe(false);
		expect(params.has(SONG_CORPUS_URL_PARAM_MIN_SECTIONS)).toBe(false);
	});
});
