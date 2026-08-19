import { describe, expect, it } from "vitest";
import { findDensityClusters, type ClusterPoint } from "./densityClusters.js";

const blobAround = (
	prefix: string,
	centerX: number,
	centerY: number,
	count: number,
	spread: number
): ClusterPoint[] =>
	Array.from({ length: count }, (_, index) => {
		// Deterministic jitter so the test has no flakiness.
		const angle = (index / count) * Math.PI * 2;
		const radius = spread * (0.3 + 0.7 * ((index % 5) / 5));
		return {
			songKey: `${prefix}-${index}`,
			x: centerX + Math.cos(angle) * radius,
			y: centerY + Math.sin(angle) * radius
		};
	});

describe("findDensityClusters", () => {
	it("returns nothing below the minimum point count", () => {
		const points = blobAround("a", 0.2, 0.2, 5, 0.01);
		expect(findDensityClusters(points, 15)).toEqual([]);
	});

	it("separates two dense, well-separated blobs into two clusters", () => {
		const points = [
			...blobAround("near-origin", 0.1, 0.1, 20, 0.01),
			...blobAround("far-corner", 0.9, 0.9, 20, 0.01)
		];

		const clusters = findDensityClusters(points, 10);

		expect(clusters).toHaveLength(2);
		const songKeySets = clusters.map((cluster) => new Set(cluster.songKeys));
		expect(songKeySets[0].size + songKeySets[1].size).toBe(points.length);
		for (const point of points) {
			const prefix = point.songKey.startsWith("near-origin")
				? "near-origin"
				: "far-corner";
			const owningCluster = songKeySets.find((set) => set.has(point.songKey));
			expect(owningCluster).toBeDefined();
			expect([...owningCluster!].every((key) => key.startsWith(prefix))).toBe(
				true
			);
		}
	});

	it("excludes far-flung isolated points from a dense blob's cluster", () => {
		const core = blobAround("core", 0.5, 0.5, 25, 0.01);
		const isolated: ClusterPoint[] = [
			{ songKey: "isolated-0", x: 0.05, y: 0.05 },
			{ songKey: "isolated-1", x: 0.95, y: 0.05 },
			{ songKey: "isolated-2", x: 0.05, y: 0.95 }
		];

		const clusters = findDensityClusters([...core, ...isolated], 10);

		expect(clusters).toHaveLength(1);
		expect(clusters[0].songKeys).toHaveLength(core.length);
		for (const point of isolated) {
			expect(clusters[0].songKeys).not.toContain(point.songKey);
		}
	});

	it("merges a dense blob plus a handful of nearby stragglers into one cluster", () => {
		const core = blobAround("core", 0.5, 0.5, 20, 0.01);
		const stragglers: ClusterPoint[] = [
			{ songKey: "straggler-0", x: 0.51, y: 0.51 },
			{ songKey: "straggler-1", x: 0.49, y: 0.5 }
		];

		const clusters = findDensityClusters([...core, ...stragglers], 10);

		expect(clusters).toHaveLength(1);
		expect(clusters[0].songKeys).toContain("straggler-0");
		expect(clusters[0].songKeys).toContain("straggler-1");
	});

	it("returns an empty array for an empty input", () => {
		expect(findDensityClusters([])).toEqual([]);
	});

	it("gives the same cluster the same hash across independent runs, and different clusters different hashes", () => {
		const points = [
			...blobAround("near-origin", 0.1, 0.1, 20, 0.01),
			...blobAround("far-corner", 0.9, 0.9, 20, 0.01)
		];

		const first = findDensityClusters(points, 10);
		const second = findDensityClusters(points, 10);

		expect(first).toHaveLength(2);
		expect(second).toHaveLength(2);
		const hashesFirst = first.map((cluster) => cluster.hash).sort();
		const hashesSecond = second.map((cluster) => cluster.hash).sort();
		expect(hashesFirst).toEqual(hashesSecond);
		expect(hashesFirst[0]).not.toBe(hashesFirst[1]);
	});

	it("sorts clusters largest-first", () => {
		const points = [
			...blobAround("small", 0.1, 0.1, 12, 0.01),
			...blobAround("big", 0.9, 0.9, 25, 0.01)
		];

		const clusters = findDensityClusters(points, 10);

		expect(clusters).toHaveLength(2);
		expect(clusters[0].songKeys.length).toBeGreaterThan(
			clusters[1].songKeys.length
		);
		expect(clusters[0].songKeys[0].startsWith("big")).toBe(true);
	});
});
