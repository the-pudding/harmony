import { describe, expect, it } from "vitest";
import {
	playheadUrlValue,
	readDesignUrlState,
	zoomUrlValue
} from "./designUrlState.js";
import { DEFAULT_ZOOM } from "./timelineZoom.js";

describe("readDesignUrlState", () => {
	it("reads zoom and playhead from the URL", () => {
		expect(readDesignUrlState(new URLSearchParams("zoom=8&t=42.5"))).toEqual({
			zoom: 8,
			playheadSeconds: 42.5
		});
	});

	it("falls back to defaults for missing or invalid values", () => {
		const defaults = { zoom: DEFAULT_ZOOM, playheadSeconds: 0 };
		expect(readDesignUrlState(new URLSearchParams())).toEqual(defaults);
		expect(readDesignUrlState(new URLSearchParams("zoom=3&t=abc"))).toEqual(
			defaults
		);
		expect(readDesignUrlState(new URLSearchParams("t=-5"))).toEqual(defaults);
	});
});

describe("URL values", () => {
	it("omits the default zoom", () => {
		expect(zoomUrlValue(DEFAULT_ZOOM)).toBeNull();
		expect(zoomUrlValue(4)).toBe("4");
	});

	it("rounds the playhead and omits the song start", () => {
		expect(playheadUrlValue(12.34567)).toBe("12.35");
		expect(playheadUrlValue(0.001)).toBeNull();
	});
});
