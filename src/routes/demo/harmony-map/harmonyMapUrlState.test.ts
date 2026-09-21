import { describe, expect, it } from "vitest";
import {
	areHarmonyMapUrlStatesEqual,
	clampYearScrubRange,
	HARMONY_MAP_URL_PARAM_YEAR_MAX,
	HARMONY_MAP_URL_PARAM_YEAR_MIN,
	isFullYearScrubRange,
	readHarmonyMapUrlState,
	writeHarmonyMapUrlState,
	type HarmonyMapUrlState
} from "./harmonyMapUrlState.js";
import { DEFAULT_BLEND_WEIGHTS } from "./embedding/vectors/constants.js";
import { DEFAULT_MAP_VIEW_MODE } from "./viewMode.js";

const baseState = (): HarmonyMapUrlState => ({
	method: "umap",
	view: DEFAULT_MAP_VIEW_MODE,
	blendWeights: DEFAULT_BLEND_WEIGHTS,
	yearRange: null
});

describe("harmonyMapUrlState year range", () => {
	it("round-trips ymin/ymax through URLSearchParams", () => {
		const state: HarmonyMapUrlState = {
			...baseState(),
			yearRange: { min: 1960, max: 1975 }
		};
		const params = new URLSearchParams();
		writeHarmonyMapUrlState(params, state);
		expect(params.get(HARMONY_MAP_URL_PARAM_YEAR_MIN)).toBe("1960");
		expect(params.get(HARMONY_MAP_URL_PARAM_YEAR_MAX)).toBe("1975");
		expect(readHarmonyMapUrlState(params).yearRange).toEqual({
			min: 1960,
			max: 1975
		});
	});

	it("omits year params when the range is null (full domain)", () => {
		const params = new URLSearchParams("ymin=1960&ymax=1975");
		writeHarmonyMapUrlState(params, baseState());
		expect(params.has(HARMONY_MAP_URL_PARAM_YEAR_MIN)).toBe(false);
		expect(params.has(HARMONY_MAP_URL_PARAM_YEAR_MAX)).toBe(false);
	});

	it("ignores incomplete or non-integer year params", () => {
		expect(readHarmonyMapUrlState(new URLSearchParams("ymin=1960")).yearRange).toBe(
			null
		);
		expect(
			readHarmonyMapUrlState(new URLSearchParams("ymin=1960.5&ymax=1970")).yearRange
		).toBe(null);
	});

	it("swaps inverted ymin/ymax on read", () => {
		expect(
			readHarmonyMapUrlState(new URLSearchParams("ymin=1980&ymax=1960")).yearRange
		).toEqual({ min: 1960, max: 1980 });
	});

	it("clamps and compares year ranges", () => {
		expect(
			clampYearScrubRange({ min: 1900, max: 2000 }, { min: 1950, max: 1990 })
		).toEqual({ min: 1950, max: 1990 });
		expect(
			isFullYearScrubRange({ min: 1950, max: 1990 }, { min: 1950, max: 1990 })
		).toBe(true);
		expect(
			areHarmonyMapUrlStatesEqual(
				{ ...baseState(), yearRange: { min: 1960, max: 1970 } },
				{ ...baseState(), yearRange: { min: 1960, max: 1970 } }
			)
		).toBe(true);
		expect(
			areHarmonyMapUrlStatesEqual(
				{ ...baseState(), yearRange: { min: 1960, max: 1970 } },
				baseState()
			)
		).toBe(false);
	});
});
