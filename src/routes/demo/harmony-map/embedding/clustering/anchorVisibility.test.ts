import { describe, expect, it } from "vitest";
import { computeVisibleAnchorSongKeys } from "./anchorVisibility.js";
import type { DensityCluster } from "./densityClusters.js";

const makeCluster = (id: number, songKeys: string[]): DensityCluster => ({
	id,
	songKeys,
	hash: `cluster-${id}`
});

describe("computeVisibleAnchorSongKeys", () => {
	it("keeps a cluster-owned anchor visible while its cluster is visible", () => {
		const clusters = [makeCluster(1, ["anchor-a", "b", "c"])];
		const visible = computeVisibleAnchorSongKeys(
			new Set(["anchor-a"]),
			clusters,
			new Set()
		);
		expect(visible.has("anchor-a")).toBe(true);
	});

	it("hides a cluster-owned anchor once its own cluster is hidden", () => {
		const clusters = [
			makeCluster(1, ["anchor-a", "b"]),
			makeCluster(2, ["anchor-x", "y"])
		];
		const visible = computeVisibleAnchorSongKeys(
			new Set(["anchor-a", "anchor-x"]),
			clusters,
			new Set(["cluster-1"]) // only cluster 1 hidden
		);
		expect(visible.has("anchor-a")).toBe(false);
		expect(visible.has("anchor-x")).toBe(true);
	});

	it("keeps a no-cluster-membership anchor visible as long as some cluster is visible", () => {
		const clusters = [makeCluster(1, ["a", "b"])];
		const visible = computeVisibleAnchorSongKeys(
			new Set(["orphan-anchor"]),
			clusters,
			new Set() // nothing hidden
		);
		expect(visible.has("orphan-anchor")).toBe(true);
	});

	it("hides a no-cluster-membership anchor once every cluster is hidden (deselect all)", () => {
		const clusters = [makeCluster(1, ["a"]), makeCluster(2, ["b"])];
		const visible = computeVisibleAnchorSongKeys(
			new Set(["orphan-anchor"]),
			clusters,
			new Set(["cluster-1", "cluster-2"]) // every cluster hidden
		);
		expect(visible.has("orphan-anchor")).toBe(false);
	});

	it("brings a no-cluster-membership anchor back once any cluster is visible again", () => {
		const clusters = [makeCluster(1, ["a"]), makeCluster(2, ["b"])];
		const visible = computeVisibleAnchorSongKeys(
			new Set(["orphan-anchor"]),
			clusters,
			new Set(["cluster-1"]) // cluster 2 still visible
		);
		expect(visible.has("orphan-anchor")).toBe(true);
	});

	it("treats a no-cluster-membership anchor as visible when there are no clusters at all", () => {
		const visible = computeVisibleAnchorSongKeys(
			new Set(["orphan-anchor"]),
			[],
			new Set()
		);
		expect(visible.has("orphan-anchor")).toBe(true);
	});
});
