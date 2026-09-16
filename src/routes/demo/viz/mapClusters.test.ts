import { describe, expect, it } from "vitest";
import { computeNamedClusterOutlines } from "./mapClusters.js";
import type { DensityCluster } from "../harmony-map/embedding/clustering/densityClusters.js";
import type { EmbeddingPoint } from "./embeddingWorldPoints.js";

describe("computeNamedClusterOutlines", () => {
	const worldPoints: EmbeddingPoint[] = [
		{ songKey: "s1", x: 10, y: 10 },
		{ songKey: "s2", x: 14, y: 12 },
		{ songKey: "s3", x: 12, y: 16 },
		{ songKey: "far1", x: 900, y: 900 }
	];

	it("fits an outline for every cluster that resolved to a name", () => {
		const clusters: DensityCluster[] = [
			{ id: 0, hash: "a", songKeys: ["s1", "s2", "s3"] },
			{ id: 1, hash: "b", songKeys: ["far1"] }
		];
		const nameByHash = new Map([
			["a", "doo-wop"],
			["b", "solo cluster"]
		]);
		const outlines = computeNamedClusterOutlines(clusters, nameByHash, worldPoints, 4);
		expect(outlines.map((o) => o.name).sort()).toEqual(["doo-wop", "solo cluster"]);
	});

	it("skips clusters with no resolved name", () => {
		const clusters: DensityCluster[] = [
			{ id: 0, hash: "unnamed", songKeys: ["s1", "s2", "s3"] }
		];
		const outlines = computeNamedClusterOutlines(clusters, new Map(), worldPoints, 4);
		expect(outlines).toHaveLength(0);
	});

	it("does not cap the number of outlines returned", () => {
		const clusters: DensityCluster[] = Array.from({ length: 10 }, (_, i) => ({
			id: i,
			hash: `h${i}`,
			songKeys: ["s1"]
		}));
		const nameByHash = new Map(clusters.map((c) => [c.hash, `name-${c.id}`]));
		const outlines = computeNamedClusterOutlines(clusters, nameByHash, worldPoints, 4);
		expect(outlines).toHaveLength(10);
	});

	it("skips a named cluster whose members have no known world position", () => {
		const clusters: DensityCluster[] = [
			{ id: 0, hash: "missing", songKeys: ["not-in-world-points"] }
		];
		const nameByHash = new Map([["missing", "ghost"]]);
		const outlines = computeNamedClusterOutlines(clusters, nameByHash, worldPoints, 4);
		expect(outlines).toHaveLength(0);
	});
});
