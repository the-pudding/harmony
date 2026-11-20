import { describe, expect, it } from "vitest";
import { buildSongTable } from "../songTable.js";
import { fixtureSnapshot } from "../testSnapshot.js";
import { computeLayout } from "./cache.js";
import {
	DEFAULT_TIMELINE_PARAMS,
	PHONE_STAR_RADIUS,
	STAR_RADIUS,
	TIMELINE_FIRST_YEAR,
	TIMELINE_LAST_YEAR,
	timelineLayout
} from "./timeline.js";

const years = (count: number) =>
	Array.from({ length: count }, (_, i) =>
		i % 10 === 9 ? 0 : TIMELINE_FIRST_YEAR + ((i * 7) % 69)
	);
const table = (override?: number[]) => {
	const snapshot = fixtureSnapshot();
	return buildSongTable({
		...snapshot,
		years: override ?? years(snapshot.songKeys.length)
	});
};

const songs = table();
const frame = { width: 1000, height: 600 };
const compute = (frameSize = frame) =>
	timelineLayout.compute({ songs, frame: frameSize }, DEFAULT_TIMELINE_PARAMS);

describe("timelineLayout", () => {
	it("keeps every dated song inside the frame", () => {
		const { x, y } = compute();
		for (let index = 0; index < songs.count; index++) {
			if (songs.year[index] === 0) continue;
			expect(x[index]).toBeGreaterThanOrEqual(0);
			expect(x[index]).toBeLessThan(1);
			expect(y[index]).toBeGreaterThanOrEqual(0);
			expect(y[index]).toBeLessThan(1);
		}
	});

	it("is deterministic", () => {
		const a = compute();
		const b = timelineLayout.compute(
			{ songs: table(), frame },
			DEFAULT_TIMELINE_PARAMS
		);
		expect(Array.from(b.x)).toEqual(Array.from(a.x));
		expect(Array.from(b.y)).toEqual(Array.from(a.y));
	});

	it("puts a song's year in its own slice, so earlier years sit left of later ones", () => {
		const { x } = compute();
		const slice = 1 / (TIMELINE_LAST_YEAR - TIMELINE_FIRST_YEAR + 1);
		for (let index = 0; index < songs.count; index++) {
			const year = songs.year[index];
			if (year === 0) continue;
			const start = (year - TIMELINE_FIRST_YEAR) * slice;
			expect(x[index]).toBeGreaterThanOrEqual(start - 1e-6);
			expect(x[index]).toBeLessThanOrEqual(start + slice + 1e-6);
		}
	});

	it("puts a song in the same place in any frame size", () => {
		const a = compute();
		const b = compute({ width: 390, height: 500 });
		expect(Array.from(b.x)).toEqual(Array.from(a.x));
		expect(Array.from(b.y)).toEqual(Array.from(a.y));
	});

	it("leaves undated songs unplaced and clamps years outside the range", () => {
		const custom = table(
			fixtureSnapshot().songKeys.map((_, i) =>
				i === 0 ? 0 : i === 1 ? 1900 : i === 2 ? 2100 : 2000
			)
		);
		const { x } = timelineLayout.compute(
			{ songs: custom, frame },
			DEFAULT_TIMELINE_PARAMS
		);
		expect(Number.isNaN(x[0])).toBe(true);
		expect(x[1]).toBeLessThan(1 / 69 + 1e-6);
		expect(x[2]).toBeGreaterThan(68 / 69 - 1e-6);
	});

	it("describes a framed star field", () => {
		const result = compute();
		expect(result.name).toBe("timeline");
		expect(result.framed).toBe(true);
		expect(result.aggregate).toBe("none");
		expect(result.color).toBe("star");
		expect(result.pointRadius).toBe(STAR_RADIUS);
		expect(result.guides).toEqual([]);
	});

	it("uses smaller stars on phones", () => {
		expect(compute({ width: 390, height: 500 }).pointRadius).toBe(
			PHONE_STAR_RADIUS
		);
	});

	it("is cached per frame size", () => {
		const a = computeLayout("timeline", DEFAULT_TIMELINE_PARAMS, {
			songs,
			frame
		});
		expect(
			computeLayout(
				"timeline",
				{ ...DEFAULT_TIMELINE_PARAMS },
				{ songs, frame }
			)
		).toBe(a);
		expect(
			computeLayout("timeline", DEFAULT_TIMELINE_PARAMS, {
				songs,
				frame: { width: 900, height: 600 }
			})
		).not.toBe(a);
	});
});
