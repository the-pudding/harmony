import { describe, expect, it } from "vitest";
import { canStepZoom, steppedZoom, ZOOM_LEVELS } from "./timelineZoom.js";

const MIN_ZOOM = ZOOM_LEVELS[0];
const MAX_ZOOM = ZOOM_LEVELS[ZOOM_LEVELS.length - 1];

describe("steppedZoom", () => {
	it("moves to the neighboring zoom level", () => {
		expect(steppedZoom(MIN_ZOOM, 1)).toBe(ZOOM_LEVELS[1]);
		expect(steppedZoom(ZOOM_LEVELS[1], -1)).toBe(MIN_ZOOM);
	});

	it("stays within the available levels", () => {
		expect(steppedZoom(MIN_ZOOM, -1)).toBe(MIN_ZOOM);
		expect(steppedZoom(MAX_ZOOM, 1)).toBe(MAX_ZOOM);
	});
});

describe("canStepZoom", () => {
	it("is false at either end", () => {
		expect(canStepZoom(MIN_ZOOM, -1)).toBe(false);
		expect(canStepZoom(MAX_ZOOM, 1)).toBe(false);
		expect(canStepZoom(MIN_ZOOM, 1)).toBe(true);
	});
});
