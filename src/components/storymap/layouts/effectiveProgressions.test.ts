import { describe, expect, it } from "vitest";
import { homogeneityBandFor } from "$routes/demo/shared/progressionHomogeneity.js";
import { buildSongTable } from "../songTable.js";
import { fixtureSnapshot } from "../testSnapshot.js";
import { computeLayout } from "./cache.js";
import {
	effectiveProgressionsByDecadeLayout,
	effectiveProgressionsLayout
} from "./effectiveProgressions.js";
import { DEFAULT_TIMELINE_PARAMS } from "./timeline.js";

const songs = buildSongTable(fixtureSnapshot());
const frame = { width: 1000, height: 600 };
const context = { songs, frame };
const single = () =>
	effectiveProgressionsLayout.compute(context, DEFAULT_TIMELINE_PARAMS);
const byDecade = () =>
	effectiveProgressionsByDecadeLayout.compute(context, DEFAULT_TIMELINE_PARAMS);

const bandOf = (index: number) =>
	homogeneityBandFor(songs.homogeneity[index]!.effectiveProgressionCount);
const placed = Array.from({ length: songs.count }, (_, index) => index).filter(
	(index) => songs.homogeneity[index]
);
const decadeOf = (index: number) => Math.floor(songs.year[index] / 10);

describe("effectiveProgressions layouts", () => {
	it("has songs with homogeneity in more than one band to test with", () => {
		expect(placed.length).toBeGreaterThan(10);
		expect(
			new Set(placed.map((index) => bandOf(index).id)).size
		).toBeGreaterThan(1);
	});

	it.each([
		["effectiveProgressions", single],
		["effectiveProgressionsByDecade", byDecade]
	])("%s places every song with homogeneity inside the frame", (_, compute) => {
		const { x, y } = compute();
		for (let index = 0; index < songs.count; index++) {
			if (songs.homogeneity[index]) {
				expect(x[index]).toBeGreaterThanOrEqual(0);
				expect(x[index]).toBeLessThanOrEqual(1);
				expect(y[index]).toBeGreaterThanOrEqual(0);
				expect(y[index]).toBeLessThanOrEqual(1);
			} else {
				expect(x[index]).toBeNaN();
				expect(y[index]).toBeNaN();
			}
		}
	});

	it("leaves songs without homogeneity unplaced", () => {
		const snapshot = fixtureSnapshot();
		snapshot.progressions[7] = [];
		const table = buildSongTable(snapshot);
		expect(table.homogeneity[7]).toBeNull();
		const { x, y } = effectiveProgressionsLayout.compute(
			{ songs: table, frame },
			DEFAULT_TIMELINE_PARAMS
		);
		expect(x[7]).toBeNaN();
		expect(y[7]).toBeNaN();
		expect(x[8]).not.toBeNaN();
	});

	it("single bar: within a band, older songs are never right of newer ones", () => {
		const { x } = single();
		for (const a of placed) {
			for (const b of placed) {
				if (bandOf(a).id !== bandOf(b).id) continue;
				if (songs.year[a] < songs.year[b]) {
					expect(x[a]).toBeLessThanOrEqual(x[b] + 1e-6);
				}
			}
		}
	});

	it("stacks the bands, with the ≈1 band below the 6+ band", () => {
		const lowest = bandOf(
			placed.reduce((a, b) =>
				bandOf(a).upperBound <= bandOf(b).upperBound ? a : b
			)
		);
		const highest = bandOf(
			placed.reduce((a, b) =>
				bandOf(a).upperBound >= bandOf(b).upperBound ? a : b
			)
		);
		expect(lowest.id).not.toBe(highest.id);
		const bottom = placed.filter((index) => bandOf(index).id === lowest.id);
		const top = placed.filter((index) => bandOf(index).id === highest.id);
		// One bar: every ≈1 song below every 6+ song. By decade: within each bar.
		for (const [layout, sameBarOnly] of [
			[single(), false],
			[byDecade(), true]
		] as const) {
			for (const low of bottom) {
				for (const high of top) {
					if (sameBarOnly && decadeOf(low) !== decadeOf(high)) continue;
					expect(layout.y[low]).toBeLessThan(layout.y[high]);
				}
			}
		}
	});

	it("by decade: earlier decades are left of later ones", () => {
		const { x } = byDecade();
		for (const a of placed) {
			for (const b of placed) {
				if (decadeOf(a) < decadeOf(b)) expect(x[a]).toBeLessThan(x[b]);
			}
		}
	});

	it("fills each placed song with its band's color", () => {
		for (const { fill } of [single(), byDecade()]) {
			for (const index of placed) {
				expect(fill![index]).toBe(bandOf(index).color);
			}
			const unplaced = Array.from({ length: songs.count }, (_, i) => i).filter(
				(index) => !songs.homogeneity[index]
			);
			for (const index of unplaced) expect(fill![index]).toBeNull();
		}
	});

	it("draws a box per decade in the by-decade layout, and none in the single bar", () => {
		const decades = new Set(placed.map(decadeOf));
		const boxes = byDecade().guides!.filter((guide) => guide.kind === "box");
		expect(boxes).toHaveLength(decades.size);
		for (const box of boxes) {
			expect(box.width).toBeGreaterThan(0);
			expect(box.height).toBeGreaterThan(0);
		}
		expect(single().guides!.some((guide) => guide.kind === "box")).toBe(false);
	});

	it("caches by frame size through computeLayout", () => {
		const a = computeLayout(
			"effectiveProgressions",
			DEFAULT_TIMELINE_PARAMS,
			context
		);
		expect(
			computeLayout("effectiveProgressions", DEFAULT_TIMELINE_PARAMS, context)
		).toBe(a);
		expect(
			computeLayout("effectiveProgressions", DEFAULT_TIMELINE_PARAMS, {
				songs,
				frame: { width: 500, height: 400 }
			})
		).not.toBe(a);
	});
});
