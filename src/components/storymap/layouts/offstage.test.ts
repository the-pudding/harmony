import { describe, expect, it } from "vitest";
import { buildSongTable } from "../songTable.js";
import { fixtureSnapshot } from "../testSnapshot.js";
import { computeLayout } from "./cache.js";
import { OFFSTAGE_DISTANCE, offstageLayout } from "./offstage.js";
import { DEFAULT_UMAP_PARAMS, umapLayout } from "./umap.js";

const songs = buildSongTable(fixtureSnapshot());
const context = { songs, frame: { width: 1000, height: 700 } };
const onPlot = umapLayout.compute(context, DEFAULT_UMAP_PARAMS);
const offstage = offstageLayout.compute(context, DEFAULT_UMAP_PARAMS);

const centroidOf = (members: readonly number[]) => ({
	x: members.reduce((sum, index) => sum + onPlot.x[index], 0) / members.length,
	y: members.reduce((sum, index) => sum + onPlot.y[index], 0) / members.length
});

describe("offstageLayout", () => {
	it("draws dots across the whole plot", () => {
		expect(offstage.name).toBe("offstage");
		expect(offstage.framed).toBe(false);
		expect(offstage.aggregate).toBe("none");
	});

	it("leaves every song outside the plot", () => {
		for (let index = 0; index < songs.count; index++) {
			const outside =
				offstage.x[index] < 0 ||
				offstage.x[index] > 1 ||
				offstage.y[index] < 0 ||
				offstage.y[index] > 1;
			expect(outside).toBe(true);
		}
	});

	it("pushes a cluster's songs straight away from its centroid", () => {
		songs.clusterMembers.forEach((members) => {
			const centroid = centroidOf(members);
			for (const index of members) {
				const before = Math.hypot(
					onPlot.x[index] - centroid.x,
					onPlot.y[index] - centroid.y
				);
				const after = Math.hypot(
					offstage.x[index] - centroid.x,
					offstage.y[index] - centroid.y
				);
				expect(after).toBeCloseTo(before + OFFSTAGE_DISTANCE, 4);
			}
		});
	});

	it("pushes songs in no cluster away from the plot centre", () => {
		const clustered = new Set(songs.clusterMembers.flat());
		const strays = Array.from({ length: songs.count }, (_, i) => i).filter(
			(index) => !clustered.has(index)
		);
		expect(strays.length).toBeGreaterThan(0);
		for (const index of strays) {
			const before = Math.hypot(onPlot.x[index] - 0.5, onPlot.y[index] - 0.5);
			const after = Math.hypot(
				offstage.x[index] - 0.5,
				offstage.y[index] - 0.5
			);
			expect(after).toBeCloseTo(before + OFFSTAGE_DISTANCE, 4);
		}
	});

	it("is memoized by the layout cache", () => {
		expect(computeLayout("offstage", DEFAULT_UMAP_PARAMS, context)).toBe(
			computeLayout("offstage", { ...DEFAULT_UMAP_PARAMS }, context)
		);
	});
});
