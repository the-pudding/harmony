import { describe, expect, it } from "vitest";
import { buildWorldPoints } from "./embeddingWorldPoints.js";

describe("buildWorldPoints", () => {
	it("returns an empty array for no points", () => {
		expect(buildWorldPoints([], 1000)).toEqual([]);
	});

	it("maps the min/max of each axis to the world's edges", () => {
		const points = [
			{ songKey: "a", x: -5, y: 100 },
			{ songKey: "b", x: 5, y: 300 },
			{ songKey: "c", x: 0, y: 200 }
		];
		const world = buildWorldPoints(points, 1000);
		const byKey = new Map(world.map((p) => [p.songKey, p]));

		expect(byKey.get("a")!.x).toBeCloseTo(0);
		expect(byKey.get("b")!.x).toBeCloseTo(1000);
		expect(byKey.get("c")!.x).toBeCloseTo(500);

		expect(byKey.get("a")!.y).toBeCloseTo(0);
		expect(byKey.get("b")!.y).toBeCloseTo(1000);
		expect(byKey.get("c")!.y).toBeCloseTo(500);
	});

	it("scales x and y independently", () => {
		// x spans 0-10, y spans 0-100 — each axis should still fill 0-worldSize.
		const points = [
			{ songKey: "a", x: 0, y: 0 },
			{ songKey: "b", x: 10, y: 100 }
		];
		const world = buildWorldPoints(points, 500);
		const b = world.find((p) => p.songKey === "b")!;
		expect(b.x).toBeCloseTo(500);
		expect(b.y).toBeCloseTo(500);
	});

	it("places a single point (zero span) at the world origin rather than dividing by zero", () => {
		const world = buildWorldPoints([{ songKey: "solo", x: 42, y: -7 }], 1000);
		expect(world).toHaveLength(1);
		expect(Number.isFinite(world[0].x)).toBe(true);
		expect(Number.isFinite(world[0].y)).toBe(true);
	});

	it("preserves song keys", () => {
		const points = [
			{ songKey: "x", x: 0, y: 0 },
			{ songKey: "y", x: 1, y: 1 }
		];
		const world = buildWorldPoints(points, 100);
		expect(world.map((p) => p.songKey).sort()).toEqual(["x", "y"]);
	});
});
