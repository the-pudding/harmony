import { describe, expect, it } from "vitest";
import {
	SCATTER_DIMMED_ALPHA,
	SCATTER_NORMAL_ALPHA,
	SCATTER_YEAR_OUT_ALPHA,
	SCATTER_YEAR_OUT_IN_CLUSTER_ALPHA,
	scatterPointAlpha
} from "./scatterPoint.js";

const empty = new Set<string>();

describe("scatterPointAlpha", () => {
	it("uses the lowest year-out alpha when no song is selected", () => {
		expect(
			scatterPointAlpha({
				songKey: "a",
				hoveredSongKey: null,
				selectedSongKey: null,
				coClusterSongKeys: empty,
				highlightedSongKeys: empty,
				inYearSongKeys: new Set(["b"])
			})
		).toBe(SCATTER_YEAR_OUT_ALPHA);
	});

	it("uses medium year-out alpha for cluster mates outside the year filter", () => {
		expect(
			scatterPointAlpha({
				songKey: "mate",
				hoveredSongKey: null,
				selectedSongKey: "selected",
				coClusterSongKeys: new Set(["mate"]),
				highlightedSongKeys: empty,
				inYearSongKeys: new Set(["selected"])
			})
		).toBe(SCATTER_YEAR_OUT_IN_CLUSTER_ALPHA);
	});

	it("uses the lowest year-out alpha for non-cluster songs outside the year filter", () => {
		expect(
			scatterPointAlpha({
				songKey: "other",
				hoveredSongKey: null,
				selectedSongKey: "selected",
				coClusterSongKeys: new Set(["mate"]),
				highlightedSongKeys: empty,
				inYearSongKeys: new Set(["selected", "mate"])
			})
		).toBe(SCATTER_YEAR_OUT_ALPHA);
	});

	it("keeps existing cluster dimming for in-year songs outside the cluster", () => {
		expect(
			scatterPointAlpha({
				songKey: "other",
				hoveredSongKey: null,
				selectedSongKey: "selected",
				coClusterSongKeys: new Set(["mate"]),
				highlightedSongKeys: empty,
				inYearSongKeys: new Set(["selected", "mate", "other"])
			})
		).toBe(SCATTER_DIMMED_ALPHA);
	});

	it("keeps normal alpha for in-year idle songs", () => {
		expect(
			scatterPointAlpha({
				songKey: "a",
				hoveredSongKey: null,
				selectedSongKey: null,
				coClusterSongKeys: empty,
				highlightedSongKeys: empty,
				inYearSongKeys: new Set(["a"])
			})
		).toBe(SCATTER_NORMAL_ALPHA);
	});

	it("forces full opacity while hovered even if year-filtered out", () => {
		expect(
			scatterPointAlpha({
				songKey: "a",
				hoveredSongKey: "a",
				selectedSongKey: null,
				coClusterSongKeys: empty,
				highlightedSongKeys: empty,
				inYearSongKeys: empty
			})
		).toBe(1);
	});
});
