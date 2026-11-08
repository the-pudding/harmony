import { describe, expect, it } from "vitest";
import type { ClusterRegion } from "../../embedding/layout/hexBins.js";
import type { ScatterPoint } from "../scatterPoint.js";
import { SCATTER_NORMAL_ALPHA } from "../scatterPoint.js";
import {
	HEX_THEME_COLORS,
	JITTER_AMPLITUDE,
	NOT_PLAYING_ALPHA,
	OUTLINED_POINT_RADIUS,
	PLAYING_POINT_RADIUS,
	POINT_RADIUS,
	SELECTED_POINT_RADIUS
} from "./constants.js";
import {
	boxesOverlap,
	placeCenteredLabels,
	placeMarkerLabels
} from "./labelPlacement.js";
import { jitterFor, normalizePoints } from "./normalizePoints.js";
import { createPointStyle } from "./pointStyle.js";
import {
	colorsByProgressionName,
	createRegionFills,
	regionColorsByName
} from "./regionColors.js";

const point = (songKey: string, x: number, y: number): ScatterPoint => ({
	songKey,
	x,
	y,
	groupShares: [],
	homogeneityColor: "#000"
});

describe("normalizePoints", () => {
	it("scales into 0–1 plus a small, stable jitter", () => {
		const [a, b] = normalizePoints([point("a", 10, 5), point("b", 20, 15)]);
		expect(a.nx).toBeCloseTo(0 + jitterFor("a").nx);
		expect(b.ny).toBeCloseTo(1 + jitterFor("b").ny);
		expect(jitterFor("a")).toEqual(jitterFor("a"));
		expect(Math.abs(jitterFor("a").nx)).toBeLessThanOrEqual(JITTER_AMPLITUDE);
	});

	it("centers a degenerate axis", () => {
		const [a] = normalizePoints([point("a", 3, 3), point("b", 3, 3)]);
		expect(a.nx).toBeCloseTo(0.5, 1);
	});

	it("is empty for no points", () => {
		expect(normalizePoints([])).toEqual([]);
	});
});

describe("region colors", () => {
	const regionA: ClusterRegion = {
		id: "a",
		name: "Axis",
		progressionNames: ["axis", "axis-2"],
		showLabel: true
	};
	const regionB: ClusterRegion = {
		id: "b",
		name: "Doo-wop",
		progressionNames: ["axis", "doo-wop"],
		showLabel: true
	};
	const regionBySongKey = new Map([
		["a", regionA],
		["b", regionB]
	]);

	it("gives each region a color", () => {
		const colors = regionColorsByName(
			normalizePoints([point("a", 0, 0), point("b", 1, 1)]),
			regionBySongKey
		);
		expect([...colors.keys()].sort()).toEqual(["Axis", "Doo-wop"]);
	});

	it("maps progressions to the first region color built on them", () => {
		const colors = colorsByProgressionName(
			regionBySongKey,
			new Map([
				["Axis", "#111111"],
				["Doo-wop", "#222222"]
			])
		);
		expect(colors.get("axis")).toBe("#111111");
		expect(colors.get("doo-wop")).toBe("#222222");
	});

	it("fills unknown regions and unclustered songs with theme grays", () => {
		const theme = HEX_THEME_COLORS.dark;
		const fills = createRegionFills({
			colorByRegionName: new Map([["Axis", "#ff0000"]]),
			themeColors: theme,
			regionBySongKey,
			sharesBySongKey: new Map()
		});
		expect(fills.regionFill(null, 1, 1)).toBe(theme.unmatched);
		expect(fills.songRegionFill("nobody", 1)).toBe(theme.ambiguous);
		// Full share, or no gradient, gives the full color.
		expect(fills.regionFill("Axis", 1, 1)).toBe(fills.regionFill("Axis", 0, 0));
		expect(fills.regionFill("Axis", 0, 1)).not.toBe(
			fills.regionFill("Axis", 1, 1)
		);
	});
});

describe("createPointStyle", () => {
	const base = {
		hoveredSongKey: null,
		selectedSongKey: null,
		coClusterSongKeys: new Set<string>(),
		outlinedSongKeys: new Set(["outlined"])
	};

	it("sizes plain, selected, outlined and spotlit songs", () => {
		const style = createPointStyle({
			...base,
			selectedSongKey: "selected",
			spotlight: { emphasis: new Map([["playing", 1]]), fade: 1 }
		});
		expect(style.radiusFor("plain")).toBe(POINT_RADIUS);
		expect(style.radiusFor("selected")).toBe(SELECTED_POINT_RADIUS);
		expect(style.radiusFor("outlined")).toBe(OUTLINED_POINT_RADIUS);
		expect(style.radiusFor("playing")).toBe(PLAYING_POINT_RADIUS);
		expect(style.restingRadiusFor("playing")).toBe(POINT_RADIUS);
		expect(style.isMarked("playing")).toBe(true);
		expect(style.isMarked("plain")).toBe(false);
	});

	it("fades everything but the spotlit song", () => {
		const style = createPointStyle({
			...base,
			spotlight: { emphasis: new Map([["playing", 1]]), fade: 1 }
		});
		expect(style.alphaFor("plain")).toBeCloseTo(
			SCATTER_NORMAL_ALPHA * NOT_PLAYING_ALPHA
		);
		expect(style.alphaFor("playing")).toBeCloseTo(SCATTER_NORMAL_ALPHA);
	});

	it("draws the most emphasized marker last", () => {
		const style = createPointStyle({
			...base,
			spotlight: { emphasis: new Map([["playing", 0.5]]), fade: 0.5 }
		});
		expect(style.markedInLabelOrder()).toEqual(["outlined", "playing"]);
		expect(style.markedInDrawOrder()).toEqual(["outlined", "playing"]);
	});
});

describe("placeMarkerLabels", () => {
	const options = {
		obstacles: [],
		width: 500,
		height: 500,
		gap: 6,
		padding: 3
	};

	it("puts a label to the right of its marker when that's free", () => {
		const [label] = placeMarkerLabels(
			[
				{
					item: "a",
					screen: { x: 100, y: 100 },
					radius: 10,
					textWidth: 50,
					textHeight: 20
				}
			],
			options
		);
		expect(label.box.left).toBe(100 + 10 + 6 - 3);
	});

	it("moves to the left when the right is taken", () => {
		const labels = placeMarkerLabels(
			[
				{
					item: "a",
					screen: { x: 100, y: 100 },
					radius: 10,
					textWidth: 50,
					textHeight: 20
				},
				{
					item: "b",
					screen: { x: 100, y: 105 },
					radius: 10,
					textWidth: 50,
					textHeight: 20
				}
			],
			options
		);
		expect(labels).toHaveLength(2);
		expect(labels[1].box.right).toBeLessThan(100);
		expect(boxesOverlap(labels[0].box, labels[1].box)).toBe(false);
	});

	it("prefers a spot fully on the canvas", () => {
		const [label] = placeMarkerLabels(
			[
				{
					item: "a",
					screen: { x: 480, y: 100 },
					radius: 10,
					textWidth: 50,
					textHeight: 20
				}
			],
			options
		);
		expect(label.box.right).toBeLessThanOrEqual(480);
	});
});

describe("placeCenteredLabels", () => {
	const options = {
		measure: (text: string) => text.length * 10,
		width: 500,
		height: 500,
		paddingX: 6,
		paddingY: 6,
		repeatDistance: 150
	};

	it("skips overlapping, off-canvas and nearby repeated labels", () => {
		const placed = placeCenteredLabels(
			[
				{ item: 1, text: "Axis", x: 100, y: 100 },
				{ item: 2, text: "Pop", x: 110, y: 100 },
				{ item: 3, text: "Edge", x: 2, y: 100 },
				{ item: 4, text: "Axis", x: 200, y: 200 },
				{ item: 5, text: "Axis", x: 400, y: 400 }
			],
			options
		);
		expect(placed.map((label) => label.item)).toEqual([1, 5]);
	});
});
