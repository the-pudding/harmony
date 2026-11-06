import { describe, expect, it } from "vitest";
import { DEFAULT_RECORD_TAB, RECORD_TAB_FEATURED } from "./recordTabs.js";
import {
	playheadUrlValue,
	readRecordTab,
	readRecordUrlState,
	tabUrlValue,
	zoomUrlValue
} from "./recordUrlState.js";
import { DEFAULT_ZOOM } from "./timelineZoom.js";

describe("readRecordUrlState", () => {
	it("reads zoom and playhead from the URL", () => {
		expect(readRecordUrlState(new URLSearchParams("zoom=8&t=42.5"))).toEqual({
			zoom: 8,
			playheadSeconds: 42.5
		});
	});

	it("falls back to defaults for missing or invalid values", () => {
		const defaults = { zoom: DEFAULT_ZOOM, playheadSeconds: 0 };
		expect(readRecordUrlState(new URLSearchParams())).toEqual(defaults);
		expect(readRecordUrlState(new URLSearchParams("zoom=3&t=abc"))).toEqual(
			defaults
		);
		expect(readRecordUrlState(new URLSearchParams("t=-5"))).toEqual(defaults);
	});
});

describe("readRecordTab", () => {
	it("reads a known tab and falls back to the default", () => {
		expect(readRecordTab(new URLSearchParams("tab=featured"))).toBe(
			RECORD_TAB_FEATURED
		);
		expect(readRecordTab(new URLSearchParams("tab=nope"))).toBe(
			DEFAULT_RECORD_TAB
		);
		expect(readRecordTab(new URLSearchParams())).toBe(DEFAULT_RECORD_TAB);
	});
});

describe("URL values", () => {
	it("omits the default tab", () => {
		expect(tabUrlValue(DEFAULT_RECORD_TAB)).toBeNull();
		expect(tabUrlValue(RECORD_TAB_FEATURED)).toBe(RECORD_TAB_FEATURED);
	});

	it("omits the default zoom", () => {
		expect(zoomUrlValue(DEFAULT_ZOOM)).toBeNull();
		expect(zoomUrlValue(4)).toBe("4");
	});

	it("rounds the playhead and omits the song start", () => {
		expect(playheadUrlValue(12.34567)).toBe("12.35");
		expect(playheadUrlValue(0.001)).toBeNull();
	});
});
