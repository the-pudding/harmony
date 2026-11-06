import { describe, expect, it } from "vitest";
import { fillNoiseTileData, fractalValueNoise } from "./noiseHelpers.js";

describe("fractalValueNoise", () => {
	it("returns values in [0, 1]", () => {
		const samples = [
			[0, 0],
			[1.3, 0.7],
			[-5, 2.5],
			[100, 99],
			[0.5, 0.5]
		] as const;
		for (const [x, y] of samples) {
			const v = fractalValueNoise(x, y, 4);
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThanOrEqual(1);
		}
	});

	it("is deterministic", () => {
		expect(fractalValueNoise(3.14, 2.71, 4)).toBe(
			fractalValueNoise(3.14, 2.71, 4)
		);
	});

	it("varies across the domain", () => {
		const values = new Set(
			[0, 1, 2, 3, 4, 5].map((x) => fractalValueNoise(x * 0.1, 0, 4))
		);
		expect(values.size).toBeGreaterThan(1);
	});
});

describe("fillNoiseTileData", () => {
	const makeData = (size: number) => new Uint8ClampedArray(size * size * 4);

	it("fills the correct number of pixels", () => {
		const size = 8;
		const data = makeData(size);
		fillNoiseTileData(data, size, 0.05, 4);
		expect(data.length).toBe(size * size * 4);
	});

	it("sets RGB=255 for all pixels", () => {
		const size = 4;
		const data = makeData(size);
		fillNoiseTileData(data, size, 0.05, 4);
		for (let i = 0; i < data.length; i += 4) {
			expect(data[i]).toBe(255);
			expect(data[i + 1]).toBe(255);
			expect(data[i + 2]).toBe(255);
		}
	});

	it("alpha values are in [0, 255]", () => {
		const size = 16;
		const data = makeData(size);
		fillNoiseTileData(data, size, 0.1, 4);
		const alphas = Array.from(
			{ length: data.length / 4 },
			(_, i) => data[i * 4 + 3]
		);
		expect(alphas.every((a) => a >= 0 && a <= 255)).toBe(true);
	});

	it("produces varying alpha across the tile", () => {
		const size = 64;
		const data = makeData(size);
		fillNoiseTileData(data, size, 0.1, 4);
		const alphaSet = new Set(
			Array.from({ length: data.length / 4 }, (_, i) => data[i * 4 + 3])
		);
		expect(alphaSet.size).toBeGreaterThan(10);
	});

	it("is deterministic", () => {
		const size = 4;
		const a = makeData(size);
		const b = makeData(size);
		fillNoiseTileData(a, size, 0.05, 4);
		fillNoiseTileData(b, size, 0.05, 4);
		expect(Array.from(a)).toEqual(Array.from(b));
	});
});
