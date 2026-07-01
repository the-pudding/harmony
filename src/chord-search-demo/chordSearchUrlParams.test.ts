import { describe, expect, it } from "vitest";
import {
	buildChordSearchUrlState,
	chordSearchUrlStateToQueryString,
	readChordSearchUrlState,
	areChordSearchUrlStatesEqual,
	CHORD_SEARCH_URL_PARAM_ARTIST,
	CHORD_SEARCH_URL_PARAM_PROGRESSION,
	CHORD_SEARCH_URL_PARAM_SONG
} from "./chordSearchUrlParams.js";
import { romanTokensToParsedProgression } from "../chord-processing/romanNumerals.js";

describe("chordSearchUrlParams", () => {
	it("round-trips progression, artist, and song through URLSearchParams", () => {
		const progression = "I→V→vi→IV";
		const parsed = romanTokensToParsedProgression(progression.split("→"));
		expect(parsed).not.toBeNull();

		const state = buildChordSearchUrlState({
			searchChords: parsed!,
			selectedArtist: "The Beatles",
			titleFilter: "Let It Be"
		});

		const queryString = chordSearchUrlStateToQueryString(state);
		const params = new URLSearchParams(queryString);

		expect(params.get(CHORD_SEARCH_URL_PARAM_PROGRESSION)).toBe(progression);
		expect(params.get(CHORD_SEARCH_URL_PARAM_ARTIST)).toBe("The Beatles");
		expect(params.get(CHORD_SEARCH_URL_PARAM_SONG)).toBe("Let It Be");

		expect(readChordSearchUrlState(params)).toEqual(state);
	});

	it("omits empty values from the query string", () => {
		expect(
			chordSearchUrlStateToQueryString({
				progression: "",
				artist: "",
				song: ""
			})
		).toBe("");

		expect(
			areChordSearchUrlStatesEqual(
				{ progression: "I→V", artist: "", song: "" },
				{ progression: "I→V", artist: "", song: "" }
			)
		).toBe(true);
	});
});
