import { describe, expect, it } from "vitest";
import {
	DEFAULT_SHOW_RECENT_ONLY,
	readSongCorpusFilterUrlState,
	SONG_CORPUS_URL_PARAM_RECENT,
	SONG_CORPUS_URL_PARAM_RECENT_OFF_VALUE,
	writeSongCorpusFilterUrlState
} from "./songCorpusFilterUrlParams.js";

describe("songCorpusFilterUrlParams", () => {
	it("reads defaults when params are absent", () => {
		expect(readSongCorpusFilterUrlState(new URLSearchParams())).toEqual({
			showRecentOnly: DEFAULT_SHOW_RECENT_ONLY
		});
	});

	it("reads non-default toggle value from params", () => {
		const params = new URLSearchParams({
			[SONG_CORPUS_URL_PARAM_RECENT]: SONG_CORPUS_URL_PARAM_RECENT_OFF_VALUE
		});

		expect(readSongCorpusFilterUrlState(params)).toEqual({
			showRecentOnly: false
		});
	});

	it("writes only non-default params and preserves other keys", () => {
		const params = new URLSearchParams({ song: "abc", songsContext: "1" });
		writeSongCorpusFilterUrlState(params, { showRecentOnly: false });

		expect(params.get("song")).toBe("abc");
		expect(params.get("songsContext")).toBe("1");
		expect(params.get(SONG_CORPUS_URL_PARAM_RECENT)).toBe(
			SONG_CORPUS_URL_PARAM_RECENT_OFF_VALUE
		);
	});

	it("deletes params when returning to defaults", () => {
		const params = new URLSearchParams({
			[SONG_CORPUS_URL_PARAM_RECENT]: SONG_CORPUS_URL_PARAM_RECENT_OFF_VALUE
		});
		writeSongCorpusFilterUrlState(params, { showRecentOnly: true });

		expect(params.has(SONG_CORPUS_URL_PARAM_RECENT)).toBe(false);
	});
});
