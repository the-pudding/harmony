import { describe, expect, it } from "vitest";
import {
	ALIGNMENT_ANGLE_STEP_DEGREES,
	alignCoordsToReferenceByAngleSearch
} from "./alignCoordsToReference.js";
import type { Coords } from "./types.js";

const pointMap = (entries: [string, Coords][]): Map<string, Coords> => new Map(entries);

describe("alignCoordsToReferenceByAngleSearch", () => {
	it("returns 0 and original coords when fewer than two shared songs", () => {
		const coords = pointMap([["a", { x: 1, y: 0 }]]);
		const reference = pointMap([["a", { x: 0, y: 1 }]]);
		const result = alignCoordsToReferenceByAngleSearch(coords, reference);
		expect(result.rotationDegrees).toBe(0);
		expect(result.coordsByKey).toBe(coords);
	});

	it(`finds a ${ALIGNMENT_ANGLE_STEP_DEGREES}-degree multiple that aligns a rotated copy`, () => {
		const reference = pointMap([
			["a", { x: 2, y: 0 }],
			["b", { x: 0, y: 2 }],
			["c", { x: -1, y: -1 }]
		]);
		const rotationDegrees = 25;
		const radians = (rotationDegrees * Math.PI) / 180;
		const cosTheta = Math.cos(radians);
		const sinTheta = Math.sin(radians);
		const center = {
			x:
				[...reference.values()].reduce((sum, coords) => sum + coords.x, 0) /
				reference.size,
			y:
				[...reference.values()].reduce((sum, coords) => sum + coords.y, 0) /
				reference.size
		};
		const source = pointMap(
			[...reference.entries()].map(([key, coords]) => {
				const dx = coords.x - center.x;
				const dy = coords.y - center.y;
				return [
					key,
					{
						x: center.x + dx * cosTheta - dy * sinTheta,
						y: center.y + dx * sinTheta + dy * cosTheta
					}
				];
			})
		);

		const result = alignCoordsToReferenceByAngleSearch(source, reference);

		expect(Math.abs(result.rotationDegrees) % ALIGNMENT_ANGLE_STEP_DEGREES).toBe(0);
		expect(Math.abs(result.rotationDegrees)).toBeGreaterThan(0);

		const alignedA = result.coordsByKey.get("a")!;
		const alignedB = result.coordsByKey.get("b")!;
		const refA = reference.get("a")!;
		const refB = reference.get("b")!;

		const sourceDistance =
			(source.get("a")!.x - refA.x) ** 2 +
			(source.get("a")!.y - refA.y) ** 2 +
			(source.get("b")!.x - refB.x) ** 2 +
			(source.get("b")!.y - refB.y) ** 2;
		const alignedDistance =
			(alignedA.x - refA.x) ** 2 +
			(alignedA.y - refA.y) ** 2 +
			(alignedB.x - refB.x) ** 2 +
			(alignedB.y - refB.y) ** 2;

		expect(alignedDistance).toBeLessThan(sourceDistance);
		expect(Math.abs(result.rotationDegrees + rotationDegrees)).toBeLessThanOrEqual(
			ALIGNMENT_ANGLE_STEP_DEGREES
		);
	});

	it("keeps 0 when the layout is already aligned", () => {
		const reference = pointMap([
			["a", { x: 1, y: 0 }],
			["b", { x: 0, y: 1 }],
			["c", { x: -1, y: 0 }]
		]);
		const result = alignCoordsToReferenceByAngleSearch(reference, reference);
		expect(result.rotationDegrees).toBe(0);
		expect(result.coordsByKey.get("a")).toEqual({ x: 1, y: 0 });
	});

	it("preserves unmatched song keys", () => {
		const coords = pointMap([
			["a", { x: 1, y: 0 }],
			["b", { x: 0, y: 1 }],
			["orphan", { x: 9, y: 9 }]
		]);
		const reference = pointMap([
			["a", { x: 0, y: 1 }],
			["b", { x: -1, y: 0 }]
		]);
		const result = alignCoordsToReferenceByAngleSearch(coords, reference);
		expect(result.coordsByKey.get("orphan")).toEqual({ x: 9, y: 9 });
	});
});
