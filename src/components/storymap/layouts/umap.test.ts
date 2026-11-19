import { describe, expect, it } from "vitest";
import { applyPurityRadialLayout } from "$components/hexmap/embedding/layout/purityRadialLayout.js";
import { namedClustersFromSnapshot } from "$data/hexMapClusters.js";
import { normalizePoints } from "$components/hexmap/components/scatter/normalizePoints.js";
import { POINT_RADIUS } from "$components/hexmap/components/scatter/constants.js";
import { buildSongTable } from "../songTable.js";
import { fixtureSnapshot } from "../testSnapshot.js";
import { computeLayout } from "./cache.js";
import { DEFAULT_UMAP_PARAMS, umapLayout } from "./umap.js";

const snapshot = fixtureSnapshot();
const songs = buildSongTable(snapshot);
const frame = { width: 1000, height: 700 };

// HexMap's pipeline before layouts existed.
const oldNormalized = (purityLayout: boolean, pureThreshold: number) => {
	const points = snapshot.songKeys.map((songKey, index) => ({
		songKey,
		x: snapshot.x[index],
		y: snapshot.y[index],
		groupShares: [],
		homogeneityColor: ""
	}));
	const laidOut = purityLayout
		? applyPurityRadialLayout(
				points,
				namedClustersFromSnapshot(snapshot).map(({ cluster }) => cluster),
				new Map(
					snapshot.songKeys.map((songKey, index) => [
						songKey,
						songs.homogeneity[index]?.dominantShare ?? 0
					])
				),
				{ pureThreshold }
			)
		: points;
	return normalizePoints(laidOut);
};

describe("umapLayout", () => {
	it.each([
		[true, 0.9],
		[true, 0.5],
		[false, 0.9]
	])(
		"matches the old pipeline (purity %s, threshold %s)",
		(purityLayout, pureThreshold) => {
			const result = umapLayout.compute(
				{ songs, frame },
				{ purityLayout, pureThreshold }
			);
			const expected = oldNormalized(purityLayout, pureThreshold);
			expect(result.x).toHaveLength(expected.length);
			expected.forEach((point, index) => {
				expect(Math.abs(result.x[index] - point.nx)).toBeLessThan(1e-6);
				expect(Math.abs(result.y[index] - point.ny)).toBeLessThan(1e-6);
			});
		}
	);

	it("describes the hex map", () => {
		const result = umapLayout.compute({ songs, frame }, DEFAULT_UMAP_PARAMS);
		expect(result.aggregate).toBe("hex");
		expect(result.color).toBe("region");
		expect(result.pointRadius).toBe(POINT_RADIUS);
		expect(result.guides).toEqual([]);
	});

	it("actually applies the purity layout", () => {
		const on = umapLayout.compute({ songs, frame }, DEFAULT_UMAP_PARAMS);
		const off = umapLayout.compute(
			{ songs, frame },
			{ ...DEFAULT_UMAP_PARAMS, purityLayout: false }
		);
		expect(Array.from(on.x)).not.toEqual(Array.from(off.x));
	});
});

describe("computeLayout", () => {
	it("memoizes by name, params and song table", () => {
		const a = computeLayout("umap", DEFAULT_UMAP_PARAMS, { songs, frame });
		expect(
			computeLayout(
				"umap",
				{ ...DEFAULT_UMAP_PARAMS },
				{ songs, frame: { ...frame } }
			)
		).toBe(a);
		expect(
			computeLayout(
				"umap",
				{ ...DEFAULT_UMAP_PARAMS, pureThreshold: 0.5 },
				{ songs, frame }
			)
		).not.toBe(a);
		// UMAP isn't framed, so the frame's size doesn't matter.
		expect(
			computeLayout("umap", DEFAULT_UMAP_PARAMS, {
				songs,
				frame: { width: 1, height: 1 }
			})
		).toBe(a);
		expect(
			computeLayout("umap", DEFAULT_UMAP_PARAMS, {
				songs: buildSongTable(snapshot),
				frame
			})
		).not.toBe(a);
	});
});
