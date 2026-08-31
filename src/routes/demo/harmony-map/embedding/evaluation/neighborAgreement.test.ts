import { describe, expect, it } from "vitest";
import { computeNeighborAgreement } from "./neighborAgreement.js";
import type { SongVector } from "../vectors/songVectors.js";
import type { Coords } from "../reducers/types.js";

const makeSongVector = (songKey: string, weighted: number[]): SongVector => ({
	songKey,
	counts: weighted,
	weighted
});

const makeCoords = (x: number, y: number): Coords => ({ x, y });

describe("computeNeighborAgreement", () => {
	it("returns 0 when there are not enough songs", () => {
		const coords = new Map([["a", makeCoords(0, 0)]]);
		const vectors = [makeSongVector("a", [1, 0])];
		expect(computeNeighborAgreement(coords, vectors, 8)).toBe(0);
	});

	it("returns a value in [0, 1] for random data", () => {
		const n = 20;
		const vectors = Array.from({ length: n }, (_, i) =>
			makeSongVector(
				`song-${i}`,
				Array.from({ length: 8 }, (_, j) => Math.sin(i * j + j + 1))
			)
		);
		const coords = new Map(
			vectors.map(({ songKey }, i) => [
				songKey,
				makeCoords(Math.cos(i * 0.4), Math.sin(i * 0.4))
			])
		);

		const score = computeNeighborAgreement(coords, vectors, 4);
		expect(score).toBeGreaterThanOrEqual(0);
		expect(score).toBeLessThanOrEqual(1);
	});

	it("returns a high score when 2D layout exactly mirrors high-dim ordering", () => {
		// Each song has a Gaussian-bump high-dim vector centred at position i,
		// so cosine similarity decreases monotonically with |i - j|.  The 2D coords
		// place song i at (i, 0), giving exactly the same ordering by Euclidean
		// distance.  Nearest 2D neighbors and nearest high-dim neighbors should
		// therefore agree almost perfectly.
		const n = 20;
		const SIGMA = 3;
		const vectors = Array.from({ length: n }, (_, i) =>
			makeSongVector(
				`song-${i}`,
				Array.from({ length: n }, (_, j) =>
					Math.exp(-((i - j) ** 2) / (2 * SIGMA ** 2))
				)
			)
		);
		const coords = new Map(
			vectors.map(({ songKey }, i) => [songKey, makeCoords(i, 0)])
		);

		const score = computeNeighborAgreement(coords, vectors, 4);
		expect(score).toBeGreaterThan(0.5);
	});
});
