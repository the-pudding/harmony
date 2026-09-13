import { describe, expect, it } from "vitest";
import { computeClusterVisibleShares } from "./clusterVisibility.js";
import type { DensityCluster } from "./densityClusters.js";

const makeCluster = (id: number, songKeys: string[]): DensityCluster => ({
	id,
	songKeys,
	hash: `cluster-${id}`
});

describe("computeClusterVisibleShares", () => {
	it("shares each cluster's released-song count against the total released count", () => {
		const clusters = [
			makeCluster(1, ["a", "b", "c"]),
			makeCluster(2, ["d", "e"])
		];
		const released = new Set(["a", "b", "d"]); // c and e not out yet
		const shares = computeClusterVisibleShares(clusters, released, 3);

		expect(shares.get("cluster-1")).toBeCloseTo((2 / 3) * 100);
		expect(shares.get("cluster-2")).toBeCloseTo((1 / 3) * 100);
	});

	it("treats null releasedSongKeys as everything released (uses full cluster size)", () => {
		const clusters = [makeCluster(1, ["a", "b", "c"]), makeCluster(2, ["d"])];
		const shares = computeClusterVisibleShares(clusters, null, 4);

		expect(shares.get("cluster-1")).toBeCloseTo(75);
		expect(shares.get("cluster-2")).toBeCloseTo(25);
	});

	it("returns an empty map when there are no released songs yet", () => {
		const clusters = [makeCluster(1, ["a"])];
		const shares = computeClusterVisibleShares(clusters, new Set(), 0);
		expect(shares.size).toBe(0);
	});

	it("gives a cluster with no released members a 0% share, not undefined", () => {
		const clusters = [makeCluster(1, ["a", "b"])];
		const released = new Set(["z"]); // none of cluster 1's songs are out yet
		const shares = computeClusterVisibleShares(clusters, released, 1);
		expect(shares.get("cluster-1")).toBe(0);
	});
});
