import { describe, expect, it, vi } from "vitest";

// Two featured songs in "Axis", spelled as reference.csv spells it.
vi.mock("$data/featuredClusters.js", () => {
	const rows = [
		{ cluster: "Axis", songKey: "s1" },
		{ cluster: "Axis", songKey: "s2" }
	];
	const norm = (name: string) => name.trim().toLowerCase();
	const featuredSongsOf = (name: string | null | undefined) =>
		name == null ? [] : rows.filter((row) => norm(row.cluster) === norm(name));
	return {
		featuredSongsOf,
		hasFeaturedSongs: (name: string | null | undefined) =>
			featuredSongsOf(name).length > 0,
		featuredClusterOf: (songKey: string | null | undefined) =>
			rows.find((row) => row.songKey === songKey)?.cluster
	};
});

const { resolveClusterPick } = await import("./explorePick.js");

describe("resolveClusterPick", () => {
	it("opens a cluster with samples and plays its first, by reference.csv's name", () => {
		for (const exploreSlide of [true, false]) {
			expect(
				resolveClusterPick({
					clusterName: " axis",
					songKey: null,
					exploreSlide
				})
			).toEqual({ kind: "set", clusterName: "Axis", playingSongKey: "s1" });
		}
	});

	it("plays a sample's own dot", () => {
		expect(
			resolveClusterPick({
				clusterName: "axis",
				songKey: "s2",
				exploreSlide: true
			})
		).toEqual({ kind: "set", clusterName: "Axis", playingSongKey: "s2" });
	});

	it("opens a plain dot's cluster without playing a sample", () => {
		expect(
			resolveClusterPick({
				clusterName: "axis",
				songKey: "plain",
				exploreSlide: true
			})
		).toEqual({ kind: "set", clusterName: "Axis", playingSongKey: undefined });
	});

	it("opens any cluster on the explore slide, only sampled ones elsewhere", () => {
		expect(
			resolveClusterPick({
				clusterName: "other",
				songKey: null,
				exploreSlide: true
			})
		).toEqual({ kind: "set", clusterName: "other", playingSongKey: undefined });
		expect(
			resolveClusterPick({
				clusterName: "other",
				songKey: null,
				exploreSlide: false
			})
		).toEqual({
			kind: "set",
			clusterName: undefined,
			playingSongKey: undefined
		});
	});

	it("keeps the explore slide's panel on stray clicks, closes it elsewhere", () => {
		expect(
			resolveClusterPick({
				clusterName: null,
				songKey: null,
				exploreSlide: true
			})
		).toEqual({ kind: "keep" });
		expect(
			resolveClusterPick({
				clusterName: null,
				songKey: "plain",
				exploreSlide: true
			})
		).toEqual({ kind: "keep" });
		expect(
			resolveClusterPick({
				clusterName: null,
				songKey: null,
				exploreSlide: false
			})
		).toEqual({
			kind: "set",
			clusterName: undefined,
			playingSongKey: undefined
		});
	});
});
