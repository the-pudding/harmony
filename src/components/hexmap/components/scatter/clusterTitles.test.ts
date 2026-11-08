import { describe, expect, it } from "vitest";
import { clusterTitleSpots, placeClusterTitles } from "./clusterTitles.js";
import type { ClusterHit } from "./types.js";

const hit = (
	hash: string,
	size: number,
	x: number,
	y: number,
	semiAxisX = 20,
	semiAxisY = 10,
	rotationRadians = 0
): ClusterHit => ({
	cluster: {
		id: 0,
		hash,
		songKeys: Array.from({ length: size }, (_, i) => `${hash}${i}`)
	},
	geometry: { centroid: { x, y }, semiAxisX, semiAxisY, rotationRadians }
});

describe("clusterTitleSpots", () => {
	it("puts a title just under the outline's lowest point", () => {
		const names = new Map([["a", "axis"]]);
		const [flat] = clusterTitleSpots([hit("a", 3, 100, 100)], names);
		const [upright] = clusterTitleSpots(
			[hit("a", 3, 100, 100, 20, 10, Math.PI / 2)],
			names
		);
		expect(flat.y).toBeCloseTo(100 + 10 + 6);
		expect(upright.y).toBeCloseTo(100 + 20 + 6);
	});

	it("skips unnamed clusters", () => {
		expect(clusterTitleSpots([hit("a", 3, 0, 0)], new Map())).toEqual([]);
	});
});

describe("placeClusterTitles", () => {
	const spot = (name: string, x: number, y: number, songCount: number) => ({
		hash: name,
		name,
		x,
		y,
		songCount
	});
	const view = { width: 1000, height: 800 };

	it("keeps the bigger of two overlapping titles", () => {
		const { titles } = placeClusterTitles(
			[spot("small", 105, 100, 5), spot("big", 100, 100, 50)],
			view
		);
		expect(titles.map((t) => t.name)).toEqual(["big"]);
	});

	it("keeps titles that don't touch, and drops ones off screen", () => {
		const { titles } = placeClusterTitles(
			[spot("a", 100, 100, 5), spot("b", 600, 100, 5), spot("c", 1200, 100, 9)],
			view
		);
		expect(titles.map((t) => t.name)).toEqual(["a", "b"]);
	});

	it("drops small titles that would run past the bottom limit", () => {
		const { titles } = placeClusterTitles(
			[spot("a", 100, 100, 5), spot("b", 600, 500, 5)],
			{ ...view, bottom: 520 }
		);
		expect(titles.map((t) => t.name)).toEqual(["a"]);
	});

	it("returns the merged cluster separately and keeps its bigger box clear", () => {
		const { titles, merged } = placeClusterTitles(
			[
				spot("Axis", 500, 100, 5),
				spot("near", 500, 200, 90),
				spot("far", 100, 600, 1)
			],
			{ ...view, mergedName: "axis" }
		);
		expect(merged?.name).toBe("Axis");
		expect(titles.map((t) => t.name)).toEqual(["far"]);
	});
});
