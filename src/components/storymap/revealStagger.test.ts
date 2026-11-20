import { describe, expect, it } from "vitest";
import { buildSongTable } from "./songTable.js";
import { fixtureSnapshot } from "./testSnapshot.js";
import type { LayoutResult } from "./layouts/types.js";
import { revealStagger } from "./revealStagger.js";

const songs = buildSongTable(fixtureSnapshot());

// Songs on a line from the origin (index 0) outward, the last unplaced.
const lineLayout = (framed = false): LayoutResult => {
	const x = new Float32Array(songs.count);
	const y = new Float32Array(songs.count);
	for (let index = 0; index < songs.count; index++) {
		x[index] = index / songs.count;
		y[index] = 0.5;
	}
	x[songs.count - 1] = NaN;
	return {
		name: "line",
		x,
		y,
		framed,
		aggregate: "none",
		color: "star",
		pointRadius: 2,
		guides: []
	};
};

describe("revealStagger", () => {
	it("starts at the origin and grows with distance to 1 at the farthest song", () => {
		const stagger = revealStagger(songs, lineLayout(), 0);
		expect(stagger[0]).toBe(0);
		for (let index = 1; index < songs.count - 1; index++) {
			expect(stagger[index]).toBeGreaterThan(stagger[index - 1]);
		}
		expect(stagger[songs.count - 2]).toBeCloseTo(1, 6);
	});

	it("is distance, not index: a middle origin ripples both ways", () => {
		const middle = Math.floor(songs.count / 2);
		const stagger = revealStagger(songs, lineLayout(), middle);
		expect(stagger[middle]).toBe(0);
		expect(stagger[middle - 1]).toBeCloseTo(stagger[middle + 1], 5);
		expect(Math.max(...stagger)).toBeCloseTo(1, 6);
	});

	it("runs farthest first in reverse", () => {
		const forward = revealStagger(songs, lineLayout(), 0);
		const reverse = revealStagger(songs, lineLayout(), 0, {
			order: "farthestFirst"
		});
		for (let index = 0; index < songs.count - 1; index++) {
			expect(reverse[index]).toBeCloseTo(1 - forward[index], 6);
		}
	});

	it("gives unplaced songs 0, and everything 0 for an unplaced origin", () => {
		const layout = lineLayout();
		expect(revealStagger(songs, layout, 0)[songs.count - 1]).toBe(0);
		expect(
			revealStagger(songs, layout, 0, { order: "farthestFirst" })[
				songs.count - 1
			]
		).toBe(0);
		expect([...revealStagger(songs, layout, songs.count - 1)]).toEqual(
			new Array(songs.count).fill(0)
		);
	});

	it("measures a framed layout in the frame's px", () => {
		const layout = lineLayout(true);
		layout.x[2] = layout.x[0];
		layout.y[2] = layout.y[0] - (layout.x[1] - layout.x[0]);
		const square = revealStagger(songs, layout, 0);
		expect(square[1]).toBeCloseTo(square[2], 5);
		const wide = revealStagger(songs, layout, 0, {
			frame: { width: 1000, height: 100 }
		});
		expect(wide[1]).toBeGreaterThan(wide[2]);
	});
});
