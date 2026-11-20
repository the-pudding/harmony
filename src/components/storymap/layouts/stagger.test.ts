import { describe, expect, it } from "vitest";
import { buildSongTable } from "../songTable.js";
import { fixtureSnapshot } from "../testSnapshot.js";
import { yearStagger } from "./stagger.js";

describe("yearStagger", () => {
	it("goes from the oldest song (0) to the newest (1), undated first", () => {
		const snapshot = fixtureSnapshot();
		const years = snapshot.songKeys.map((_, i) =>
			i === 0 ? 0 : 1960 + (i % 3) * 20
		);
		const stagger = yearStagger(buildSongTable({ ...snapshot, years }));
		expect(stagger[0]).toBe(0);
		years.forEach((year, i) => {
			if (year === 1960) expect(stagger[i]).toBe(0);
			if (year === 1980) expect(stagger[i]).toBeCloseTo(0.5);
			if (year === 2000) expect(stagger[i]).toBe(1);
		});
	});

	it("is all 0 without a span of years", () => {
		const snapshot = fixtureSnapshot();
		const years = snapshot.songKeys.map(() => 1990);
		const stagger = yearStagger(buildSongTable({ ...snapshot, years }));
		expect([...stagger].every((value) => value === 0)).toBe(true);
	});
});
