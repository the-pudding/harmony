import { describe, expect, it } from "vitest";
import {
	areMatchAlgoV2UrlStatesEqual,
	buildMatchAlgoV2UrlState,
	DEFAULT_MATCH_ALGO_V2_TAB,
	MATCH_ALGO_V2_TAB_OVERVIEW,
	MATCH_ALGO_V2_TAB_TRICKY,
	matchAlgoV2UrlStateToQueryString,
	readMatchAlgoV2UrlState
} from "./matchAlgoV2UrlParams.js";

describe("matchAlgoV2UrlParams", () => {
	it("defaults tab to tricky and omits it from the query string", () => {
		const state = buildMatchAlgoV2UrlState({
			tab: DEFAULT_MATCH_ALGO_V2_TAB,
			selectedSongKey: "sia__chandelier"
		});
		expect(state.tab).toBe(MATCH_ALGO_V2_TAB_TRICKY);
		expect(matchAlgoV2UrlStateToQueryString(state)).toBe("song=sia__chandelier");
	});

	it("round-trips overview tab and song", () => {
		const state = buildMatchAlgoV2UrlState({
			tab: MATCH_ALGO_V2_TAB_OVERVIEW,
			selectedSongKey: "bruno-mars__treasure"
		});
		const query = matchAlgoV2UrlStateToQueryString(state);
		expect(readMatchAlgoV2UrlState(new URLSearchParams(query))).toEqual(state);
	});

	it("treats unknown tab values as the default", () => {
		expect(readMatchAlgoV2UrlState(new URLSearchParams("tab=nope")).tab).toBe(
			DEFAULT_MATCH_ALGO_V2_TAB
		);
	});

	it("compares url states by tab and song", () => {
		const left = { tab: MATCH_ALGO_V2_TAB_OVERVIEW, song: "a" } as const;
		expect(areMatchAlgoV2UrlStatesEqual(left, { ...left })).toBe(true);
		expect(
			areMatchAlgoV2UrlStatesEqual(left, {
				tab: MATCH_ALGO_V2_TAB_TRICKY,
				song: "a"
			})
		).toBe(false);
	});
});
