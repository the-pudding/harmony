import { describe, expect, it } from "vitest";
import { buildSongTable } from "./songTable.js";
import { fixtureSnapshot } from "./testSnapshot.js";

describe("buildSongTable", () => {
	const snapshot = fixtureSnapshot();
	const table = buildSongTable(snapshot);

	it("round-trips keys and indexes", () => {
		expect(table.count).toBe(40);
		table.keys.forEach((songKey, index) => {
			expect(table.indexOf.get(songKey)).toBe(index);
		});
		expect(table.indexOf.get("nope")).toBeUndefined();
	});

	it("copies years (0 when unknown) and raw UMAP positions", () => {
		expect(table.year[0]).toBe(1960);
		expect(table.year[5]).toBe(0);
		expect(table.umapX[3]).toBe(snapshot.x[3]);
		expect(table.umapY[3]).toBe(snapshot.y[3]);
		expect(table.title[2]).toBe("Title 2");
		expect(table.artists[8]).toEqual(["Artist 1"]);
	});

	it("names each song's cluster, null for strays", () => {
		expect(table.clusterName[0]).toBe("four chords");
		expect(table.clusterName[20]).toBe("axis");
		expect(table.clusterName[35]).toBeNull();
		expect(table.clusterMembers).toHaveLength(2);
		expect(table.clusterNames).toEqual(["four chords", "axis"]);
		expect(table.clusterMembers[1][0]).toBe(15);
	});

	it("derives coverage, homogeneity and summaries once, by key and index", () => {
		expect(table.coverageBySongKey.get("song-1")).toBe(table.coverage[1]);
		expect(table.homogeneityBySongKey.get("song-0")).toBe(table.homogeneity[0]);
		expect(table.homogeneity[0]?.dominantShare).toBe(1);
		expect(table.songSummaryByKey.get("song-5")).toEqual({
			title: "Title 5",
			artists: ["Artist 5"],
			year: undefined
		});
		expect(table.songSummaryByKey.get("song-6")?.year).toBe(1966);
	});
});
