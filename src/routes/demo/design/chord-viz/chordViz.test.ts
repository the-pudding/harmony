import { describe, expect, it } from "vitest";
import { CHORD_VIZ_ROWS, diatonicChordsOf } from "./diatonicChords.js";
import {
	BLOB_RADIUS,
	BLOB_WOBBLE,
	CHORD_OVERLAP_GAP,
	CHORD_SIZE,
	blobPath,
	blobPoints,
	thresholdBlurFor
} from "./watercolor.js";

describe("diatonicChordsOf", () => {
	it("lists major scale chords in order with roman numerals and tones", () => {
		expect(diatonicChordsOf("major")).toEqual([
			{ degree: 1, roman: "I", tone: "major" },
			{ degree: 2, roman: "ii", tone: "minor" },
			{ degree: 3, roman: "iii", tone: "minor" },
			{ degree: 4, roman: "IV", tone: "major" },
			{ degree: 5, roman: "V", tone: "major" },
			{ degree: 6, roman: "vi", tone: "minor" },
			{ degree: 7, roman: "vii°", tone: "minor" }
		]);
	});

	it("lists minor scale chords in order with roman numerals", () => {
		expect(diatonicChordsOf("minor").map((chord) => chord.roman)).toEqual([
			"i",
			"ii°",
			"III",
			"iv",
			"v",
			"VI",
			"VII"
		]);
	});
});

describe("CHORD_VIZ_ROWS", () => {
	it("gives every chord a unique seed", () => {
		const seeds = CHORD_VIZ_ROWS.flatMap((row) =>
			row.chords.map((chord) => chord.seed)
		);
		expect(new Set(seeds).size).toBe(seeds.length);
	});
});

describe("blobPoints", () => {
	it("is deterministic and stays within the wobble band", () => {
		const points = blobPoints(3);
		expect(blobPoints(3)).toEqual(points);
		points.forEach(([x, y]) => {
			const radius = Math.hypot(x, y);
			expect(radius).toBeGreaterThanOrEqual(BLOB_RADIUS * (1 - BLOB_WOBBLE));
			expect(radius).toBeLessThanOrEqual(BLOB_RADIUS * (1 + BLOB_WOBBLE));
		});
	});

	it("builds an svg path", () => {
		expect(blobPath(0)).toMatch(/^M/);
	});
});

describe("CHORD_OVERLAP_GAP", () => {
	it("overlaps neighboring chord shapes", () => {
		expect(CHORD_SIZE + CHORD_OVERLAP_GAP).toBeLessThan(2 * BLOB_RADIUS);
	});
});

describe("thresholdBlurFor", () => {
	it("scales deviation with area and clamps at large areas", () => {
		expect(thresholdBlurFor(2, 0)).toBe(2);
		expect(thresholdBlurFor(2, 2000)).toBe(7);
		expect(thresholdBlurFor(2, 10000)).toBe(7);
	});
});
