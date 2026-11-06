import { describe, expect, it } from "vitest";
import {
	parseReferenceRows,
	reorderClusterRows,
	upsertReferenceRow,
	type SyncedSongReferenceRow
} from "./syncedSongReference.js";

const row = (
	cluster: string,
	songKey: string,
	visible = true
): SyncedSongReferenceRow => ({
	cluster,
	songKey,
	startSeconds: 1,
	endSeconds: 2,
	visible
});

describe("parseReferenceRows", () => {
	it("reads visible, treating a missing column as visible", () => {
		const rows = parseReferenceRows([
			{ cluster: "a", songKey: "x__y", startSeconds: "1.5", endSeconds: "3" },
			{ cluster: "a", songKey: "z__w", startSeconds: "0", endSeconds: "1", visible: "false" }
		]);
		expect(rows.map((r) => [r.startSeconds, r.visible])).toEqual([
			[1.5, true],
			[0, false]
		]);
	});
});

describe("upsertReferenceRow", () => {
	const rows = [row("a", "1"), row("a", "2", false), row("b", "3")];

	it("keeps an existing song's place and visibility", () => {
		const next = upsertReferenceRow(rows, {
			cluster: "a",
			songKey: "2",
			startSeconds: 5,
			endSeconds: 6
		});
		expect(next[1]).toEqual({ ...row("a", "2", false), startSeconds: 5, endSeconds: 6 });
	});

	it("adds new or moved songs visible at the end of their cluster", () => {
		const next = upsertReferenceRow(rows, {
			cluster: "a",
			songKey: "3",
			startSeconds: 1,
			endSeconds: 2
		});
		expect(next.map((r) => `${r.cluster}${r.songKey}${r.visible}`)).toEqual([
			"a1true",
			"a2false",
			"a3true"
		]);
	});
});

describe("reorderClusterRows", () => {
	const rows = [row("a", "1"), row("a", "2"), row("b", "3")];

	it("reorders one cluster and sets visibility", () => {
		const next = reorderClusterRows(rows, "a", [
			{ songKey: "2", visible: false },
			{ songKey: "1", visible: true }
		]);
		expect(next?.map((r) => `${r.cluster}${r.songKey}${r.visible}`)).toEqual([
			"a2false",
			"a1true",
			"b3true"
		]);
	});

	it("refuses a list that doesn't match the cluster", () => {
		expect(reorderClusterRows(rows, "a", [{ songKey: "1", visible: true }])).toBeNull();
		expect(
			reorderClusterRows(rows, "a", [
				{ songKey: "1", visible: true },
				{ songKey: "3", visible: true }
			])
		).toBeNull();
	});
});
