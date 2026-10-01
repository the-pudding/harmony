import { describe, expect, it } from "vitest";
import {
	assignRegionColors,
	averageProgressionShare,
	dominantClusterRegion,
	axialForPoint,
	binIntoHexes,
	findHexRegions,
	gradientStrengthForZoom,
	hexCenter,
	hexZoomLevel,
	summarizeHex
} from "./hexBins.js";

const zoomOptions = { baseScreenRadius: 28, dotsAtZoom: 12 };

describe("hexZoomLevel", () => {
	it("shows the biggest hexes at zoom 1", () => {
		expect(hexZoomLevel(1, zoomOptions)).toEqual({
			kind: "hex",
			level: 0,
			radius: 28
		});
	});

	it("shrinks hexes on screen as you zoom in", () => {
		const screenRadius = (zoom: number) => {
			const level = hexZoomLevel(zoom, zoomOptions);
			return level.kind === "hex" ? level.radius * zoom : 0;
		};
		expect(screenRadius(8)).toBeLessThan(screenRadius(2));
		expect(screenRadius(2)).toBeLessThan(screenRadius(1) * 1.01);
	});

	it("shrinks more gently with a lower shrink exponent", () => {
		const screenRadius = (zoom: number, shrinkExponent: number) => {
			const level = hexZoomLevel(zoom, { ...zoomOptions, shrinkExponent });
			return level.kind === "hex" ? level.radius * zoom : 0;
		};
		expect(screenRadius(4, 0.25)).toBeGreaterThan(screenRadius(4, 0.5));
	});

	it("switches to dots at the threshold", () => {
		expect(hexZoomLevel(12, zoomOptions)).toEqual({ kind: "dots" });
		expect(hexZoomLevel(11.9, zoomOptions).kind).toBe("hex");
	});
});

describe("gradientStrengthForZoom", () => {
	it("is weakest zoomed out and full at the dots threshold", () => {
		expect(gradientStrengthForZoom(1, zoomOptions)).toBeCloseTo(0.25);
		expect(gradientStrengthForZoom(12, zoomOptions)).toBeCloseTo(1);
	});
});

describe("binning", () => {
	it("round-trips a hex center to its own hex", () => {
		for (const [q, r] of [
			[0, 0],
			[3, -2],
			[-4, 5]
		]) {
			const { x, y } = hexCenter(q, r, 10);
			expect(axialForPoint(x, y, 10)).toEqual({ q, r });
		}
	});

	it("puts nearby points together and far points apart", () => {
		const bins = binIntoHexes(
			[
				{ songKey: "a", x: 1, y: 1 },
				{ songKey: "b", x: 2, y: -1 },
				{ songKey: "c", x: 100, y: 100 }
			],
			10
		);
		expect(bins.size).toBe(2);
		expect(
			[...bins.values()].find((b) => b.songKeys.includes("a"))!.songKeys
		).toEqual(["a", "b"]);
	});
});

describe("summarizeHex", () => {
	it("finds the dominant progression and its average share", () => {
		const shares = new Map([
			["a", [{ name: "axis", share: 1 }]],
			[
				"b",
				[
					{ name: "axis", share: 0.5 },
					{ name: "doo wop", share: 0.5 }
				]
			],
			["c", []]
		]);
		const summary = summarizeHex(["a", "b", "c"], shares);
		expect(summary.dominantName).toBe("axis");
		expect(summary.dominantShare).toBeCloseTo(0.5);
		expect(summary.top.map((t) => t.name)).toEqual(["axis", "doo wop"]);
		expect(summary.songCount).toBe(3);
	});

	it("has no dominant progression when nothing matched", () => {
		expect(summarizeHex(["x"], new Map()).dominantName).toBeNull();
	});
});

describe("findHexRegions", () => {
	it("groups connected hexes with the same dominant progression", () => {
		const bins = binIntoHexes(
			[0, 1, 2, 3].map((q) => ({ songKey: `s${q}`, ...hexCenter(q, 0, 10) })),
			10
		);
		const summaries = new Map(
			[...bins].map(([key, bin]) => [
				key,
				{
					dominantName: bin.q < 3 ? "axis" : "doo wop",
					dominantShare: 1,
					top: [],
					songCount: 1
				}
			])
		);
		const regions = findHexRegions(bins, summaries, 2);
		expect(regions).toHaveLength(1);
		expect(regions[0]).toMatchObject({ name: "axis", hexCount: 3 });
	});
});

describe("assignRegionColors", () => {
	const palette = ["blue", "orange", "aqua", "yellow"];
	const confusable = new Set(["orange|yellow"]);

	it("never gives close neighbors the same or a confusable color", () => {
		const colors = assignRegionColors(
			[
				{ name: "a", x: 0, y: 0, weight: 4 },
				{ name: "b", x: 1, y: 0, weight: 3 },
				{ name: "c", x: 0, y: 1, weight: 2 }
			],
			palette,
			confusable,
			2
		);
		const used = ["a", "b", "c"].map((n) => colors.get(n)!);
		expect(new Set(used).size).toBe(3);
		expect(used.includes("orange") && used.includes("yellow")).toBe(false);
	});

	it("is deterministic", () => {
		const input = [
			{ name: "a", x: 0, y: 0, weight: 1 },
			{ name: "b", x: 5, y: 5, weight: 1 }
		];
		expect(assignRegionColors(input, palette, confusable)).toEqual(
			assignRegionColors(input, palette, confusable)
		);
	});
});

describe("dominantClusterRegion", () => {
	const axis = { id: "c1", name: "axis" };
	const dooWop = { id: "c2", name: "doo wop" };
	const regions = new Map([
		["a", axis],
		["b", axis],
		["c", dooWop]
	]);

	it("picks the cluster holding at least the minimum share", () => {
		expect(dominantClusterRegion(["a", "b", "c"], regions, 0.5)).toBe(axis);
	});

	it("returns null when no cluster holds enough of the hex", () => {
		expect(
			dominantClusterRegion(["a", "c", "x", "y"], regions, 0.5)
		).toBeNull();
	});
});

describe("averageProgressionShare", () => {
	it("averages the share, counting non-users as 0", () => {
		const shares = new Map([
			["a", [{ name: "axis", share: 1 }]],
			["b", [{ name: "axis", share: 0.5 }]],
			["c", [{ name: "doo wop", share: 1 }]]
		]);
		expect(
			averageProgressionShare(["a", "b", "c"], "axis", shares)
		).toBeCloseTo(0.5);
	});
});
