import { polygonContains, randomLcg } from "d3";
import { describe, expect, it } from "vitest";
import {
	FLOATING_CHORDS,
	HEXAGON_POINTS,
	nextFloatingLocation,
	randomPointInside
} from "./floatingChords.js";

const SAMPLE_COUNT = 200;
const SAMPLE_RADIUS = 20;
const TEST_SEED = 0.7;

const isInsideHexagon = ({ x, y }: { x: number; y: number }) =>
	polygonContains(HEXAGON_POINTS, [x, y]);

describe("FLOATING_CHORDS", () => {
	it("includes every major and minor diatonic chord with a unique id", () => {
		const ids = FLOATING_CHORDS.map((chord) => chord.id);
		expect(ids).toHaveLength(14);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("starts every chord inside the hexagon", () => {
		FLOATING_CHORDS.forEach((chord) => {
			expect(isInsideHexagon(chord.start)).toBe(true);
		});
	});
});

describe("randomPointInside", () => {
	it("is deterministic for a seeded random source", () => {
		expect(randomPointInside(SAMPLE_RADIUS, randomLcg(TEST_SEED))).toEqual(
			randomPointInside(SAMPLE_RADIUS, randomLcg(TEST_SEED))
		);
	});
});

describe("nextFloatingLocation", () => {
	it("always moves to a point inside the hexagon", () => {
		const random = randomLcg(TEST_SEED);
		Array.from({ length: SAMPLE_COUNT }).forEach((_, index) => {
			const currentX = index % 2 === 0 ? SAMPLE_RADIUS : -SAMPLE_RADIUS;
			const next = nextFloatingLocation(currentX, SAMPLE_RADIUS, random);
			expect(isInsideHexagon(next)).toBe(true);
		});
	});
});
