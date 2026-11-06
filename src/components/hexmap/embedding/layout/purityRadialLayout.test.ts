import { describe, expect, it } from "vitest";
import { applyPurityRadialLayout } from "./purityRadialLayout.js";

const options = { pureThreshold: 0.9 };

// A cluster whose pure songs sit in a knot off to one side, the way UMAP
// actually places them, plus one song outside any cluster.
const points = [
	...Array.from({ length: 10 }, (_, i) => ({
		songKey: `pure-${i}`,
		x: 5 + i * 0.001,
		y: 0
	})),
	...Array.from({ length: 20 }, (_, i) => ({
		songKey: `mixed-${i}`,
		x: Math.cos(i) * 3,
		y: Math.sin(i) * 3
	})),
	{ songKey: "loner", x: 100, y: 100 }
];
const cluster = {
	songKeys: points.filter((p) => p.songKey !== "loner").map((p) => p.songKey)
};
const purity = new Map<string, number>([
	...Array.from({ length: 10 }, (_, i): [string, number] => [`pure-${i}`, 1]),
	...Array.from({ length: 20 }, (_, i): [string, number] => [
		`mixed-${i}`,
		0.3 + i * 0.02
	])
]);

const centerOf = (keys: readonly string[], source: typeof points) => {
	const members = source.filter((p) => keys.includes(p.songKey));
	return {
		x: members.reduce((s, p) => s + p.x, 0) / members.length,
		y: members.reduce((s, p) => s + p.y, 0) / members.length
	};
};

describe("applyPurityRadialLayout", () => {
	const result = applyPurityRadialLayout(points, [cluster], purity, options);
	const center = centerOf(cluster.songKeys, points);
	const distanceOf = (songKey: string) => {
		const point = result.find((p) => p.songKey === songKey)!;
		return Math.hypot(point.x - center.x, point.y - center.y);
	};

	it("puts every pure song closer to the center than every mixed song", () => {
		const farthestPure = Math.max(
			...Array.from({ length: 10 }, (_, i) => distanceOf(`pure-${i}`))
		);
		const nearestMixed = Math.min(
			...Array.from({ length: 20 }, (_, i) => distanceOf(`mixed-${i}`))
		);
		expect(farthestPure).toBeLessThan(nearestMixed);
	});

	it("places purer mixed songs closer in", () => {
		expect(distanceOf("mixed-19")).toBeLessThan(distanceOf("mixed-0"));
	});

	it("fans the pure knot out instead of leaving it on one ray", () => {
		const angles = Array.from({ length: 10 }, (_, i) => {
			const point = result.find((p) => p.songKey === `pure-${i}`)!;
			return Math.atan2(point.y - center.y, point.x - center.x);
		});
		expect(Math.max(...angles) - Math.min(...angles)).toBeGreaterThan(Math.PI);
	});

	it("keeps a mixed song's direction from the center", () => {
		const original = points.find((p) => p.songKey === "mixed-3")!;
		const moved = result.find((p) => p.songKey === "mixed-3")!;
		expect(Math.atan2(moved.y - center.y, moved.x - center.x)).toBeCloseTo(
			Math.atan2(original.y - center.y, original.x - center.x)
		);
	});

	it("leaves songs outside every cluster where they were", () => {
		expect(result.find((p) => p.songKey === "loner")).toEqual(
			points.find((p) => p.songKey === "loner")
		);
	});

	it("keeps the cluster centered in the same place", () => {
		const moved = centerOf(cluster.songKeys, result);
		expect(Math.hypot(moved.x - center.x, moved.y - center.y)).toBeLessThan(1);
	});
});
