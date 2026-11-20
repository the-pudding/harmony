import { describe, expect, it } from "vitest";
import { buildSongTable } from "../songTable.js";
import { fixtureSnapshot } from "../testSnapshot.js";
import type { Guide } from "./types.js";
import {
	containsProgression,
	MUTED_SONG_FILL,
	progressionOverTimeLayout,
	type ProgressionOverTimeParams
} from "./progressionOverTime.js";

const frame = { width: 1000, height: 600 };
const COLOR = "#ff8800";
// In the fixture, songs with index % 3 === 0 have only "I V vi IV"; the
// others also have "vi IV I V". Nobody has "I IV V".
const PROGRESSION = "vi IV I V";

// Several songs share each year: 1970 x 14, 1980 x 14, 1990 x 12, the rest
// of the 40 (index 5 included) without a year.
const crowdedSnapshot = () => {
	const snapshot = fixtureSnapshot();
	return {
		...snapshot,
		years: snapshot.songKeys.map((_, i) =>
			i === 5 ? 0 : i < 14 ? 1970 : i < 28 ? 1980 : i < 38 ? 1990 : 0
		)
	};
};

const params = (
	overrides: Partial<ProgressionOverTimeParams> = {}
): ProgressionOverTimeParams => ({
	progression: PROGRESSION,
	color: COLOR,
	highlight: null,
	...overrides
});

const run = (
	snapshot: ReturnType<typeof fixtureSnapshot>,
	overrides: Partial<ProgressionOverTimeParams> = {}
) => {
	const songs = buildSongTable(snapshot);
	const layout = progressionOverTimeLayout.compute(
		{ songs, frame },
		params(overrides)
	);
	return { songs, layout };
};

describe("progressionOverTime layout", () => {
	it("leaves songs without a year unplaced and the rest inside the frame", () => {
		for (const snapshot of [fixtureSnapshot(), crowdedSnapshot()]) {
			const { songs, layout } = run(snapshot);
			let placed = 0;
			for (let index = 0; index < songs.count; index++) {
				if (songs.year[index] > 0) {
					placed++;
					for (const value of [layout.x[index], layout.y[index]]) {
						expect(value).toBeGreaterThanOrEqual(0);
						expect(value).toBeLessThanOrEqual(1);
					}
				} else {
					expect(layout.x[index]).toBeNaN();
					expect(layout.y[index]).toBeNaN();
				}
			}
			expect(placed).toBeGreaterThan(0);
			expect(placed).toBeLessThan(songs.count);
		}
	});

	it("stacks matching songs below non-matching ones within each year", () => {
		const { songs, layout } = run(crowdedSnapshot());
		let checkedYears = 0;
		for (const year of [1970, 1980, 1990]) {
			const members = Array.from({ length: songs.count }, (_, i) => i).filter(
				(i) => songs.year[i] === year
			);
			const matching = members.filter((i) =>
				containsProgression(songs, i, PROGRESSION)
			);
			const rest = members.filter((i) => !matching.includes(i));
			expect(matching.length).toBeGreaterThan(0);
			expect(rest.length).toBeGreaterThan(0);
			const highestMatch = Math.max(...matching.map((i) => layout.y[i]));
			const lowestRest = Math.min(...rest.map((i) => layout.y[i]));
			expect(highestMatch).toBeLessThan(lowestRest);
			checkedYears++;
		}
		expect(checkedYears).toBe(3);
	});

	it("fills matching songs with the color and the others muted", () => {
		const { songs, layout } = run(crowdedSnapshot());
		for (let index = 0; index < songs.count; index++) {
			if (songs.year[index] === 0) continue;
			expect(layout.fill![index]).toBe(
				containsProgression(songs, index, PROGRESSION) ? COLOR : MUTED_SONG_FILL
			);
		}
		expect(layout.fill!.filter((f) => f === COLOR).length).toBeGreaterThan(0);
		expect(
			layout.fill!.filter((f) => f === MUTED_SONG_FILL).length
		).toBeGreaterThan(0);
	});

	it("mutes everyone when there is no progression", () => {
		const { songs, layout } = run(crowdedSnapshot(), { progression: null });
		for (let index = 0; index < songs.count; index++) {
			if (songs.year[index] > 0) {
				expect(layout.fill![index]).toBe(MUTED_SONG_FILL);
			}
		}
	});

	it("mutes everyone when nobody has the progression", () => {
		const { songs, layout } = run(crowdedSnapshot(), {
			progression: "I IV V"
		});
		for (let index = 0; index < songs.count; index++) {
			if (songs.year[index] > 0) {
				expect(layout.fill![index]).toBe(MUTED_SONG_FILL);
			}
		}
	});

	it("puts later years further right", () => {
		const { songs, layout } = run(fixtureSnapshot());
		const placed = Array.from({ length: songs.count }, (_, i) => i)
			.filter((i) => songs.year[i] > 0)
			.sort((a, b) => songs.year[a] - songs.year[b]);
		for (let i = 1; i < placed.length; i++) {
			expect(layout.x[placed[i]]).toBeGreaterThan(layout.x[placed[i - 1]]);
		}
	});

	it("is deterministic", () => {
		const first = run(crowdedSnapshot(), {
			highlight: { start: 1980, end: 1990 }
		}).layout;
		const second = run(crowdedSnapshot(), {
			highlight: { start: 1980, end: 1990 }
		}).layout;
		expect(second).toEqual(first);
	});

	it("keeps each song in its year's column when the progression changes", () => {
		const snapshot = crowdedSnapshot();
		const songs = buildSongTable(snapshot);
		const columnWidth = (frame.width - 48 - 0) / 69; // upper bound on a column
		const a = run(snapshot, { progression: PROGRESSION }).layout;
		const b = run(snapshot, { progression: "I V vi IV" }).layout;
		const none = run(snapshot, { progression: null }).layout;
		for (const other of [b, none]) {
			for (let index = 0; index < songs.count; index++) {
				if (songs.year[index] === 0) continue;
				// Songs may swap cells within their year, but stay in its column.
				expect(
					Math.abs(other.x[index] - a.x[index]) * frame.width
				).toBeLessThan(columnWidth);
			}
		}
		// Column membership is exact: ordering by x never mixes years.
		const years = [1970, 1980, 1990];
		const xRange = (layout: typeof a, year: number) => {
			const xs = Array.from({ length: songs.count }, (_, i) => i)
				.filter((i) => songs.year[i] === year)
				.map((i) => layout.x[i]);
			return [Math.min(...xs), Math.max(...xs)];
		};
		for (const layout of [a, b, none]) {
			for (let i = 1; i < years.length; i++) {
				expect(xRange(layout, years[i])[0]).toBeGreaterThan(
					xRange(layout, years[i - 1])[1]
				);
			}
		}
		// The sets of x values per year are unchanged: the progression only
		// reorders songs within a year.
		for (const year of years) {
			const xsOf = (layout: typeof a) =>
				Array.from({ length: songs.count }, (_, i) => i)
					.filter((i) => songs.year[i] === year)
					.map((i) => layout.x[i])
					.sort((p, q) => p - q);
			expect(xsOf(b)).toEqual(xsOf(a));
		}
	});

	it("draws a trend line of each year's share, and none without a progression", () => {
		const { songs, layout } = run(crowdedSnapshot());
		const trend = layout.guides.find((g) => g.kind === "line");
		expect(trend).toMatchObject({ id: "progressionOverTime:trend" });
		if (trend?.kind !== "line") throw new Error("no trend line");
		const years = [...new Set(songs.year)].filter((year) => year > 0).sort();
		expect(trend.points).toHaveLength(years.length);
		const shares = years.map((year) => {
			const inYear = Array.from(songs.year.keys()).filter(
				(i) => songs.year[i] === year
			);
			return (
				inYear.filter((i) => containsProgression(songs, i, PROGRESSION))
					.length / inYear.length
			);
		});
		// Higher share, higher point; x runs with the years.
		for (let i = 1; i < years.length; i++) {
			expect(trend.points[i].x).toBeGreaterThan(trend.points[i - 1].x);
			expect(Math.sign(trend.points[i].y - trend.points[i - 1].y)).toBe(
				Math.sign(shares[i] - shares[i - 1])
			);
		}
		const none = run(crowdedSnapshot(), { progression: null }).layout;
		expect(none.guides.some((g) => g.kind === "line")).toBe(false);
	});

	describe("highlight", () => {
		const highlight = { start: 1980, end: 1990 };
		const idOf = (guide: Guide) => ("id" in guide ? guide.id : undefined);
		const idsOf = (guides: readonly Guide[]) => guides.map(idOf);

		it("shades the years and shows the share of matching songs", () => {
			const { songs, layout } = run(crowdedSnapshot(), { highlight });
			const box = layout.guides!.find(
				(g) => g.kind === "box" && g.id === "progressionOverTime:highlight"
			);
			expect(box).toMatchObject({ kind: "box", style: "shade" });
			const inYears = Array.from({ length: songs.count }, (_, i) => i).filter(
				(i) => songs.year[i] >= 1980 && songs.year[i] < 1990
			);
			const matching = inYears.filter((i) =>
				containsProgression(songs, i, PROGRESSION)
			);
			expect(inYears.length).toBe(14);
			expect(matching.length).toBeGreaterThan(0);
			expect(matching.length).toBeLessThan(inYears.length);
			const share = layout.guides!.find(
				(g) => idOf(g) === "progressionOverTime:highlight:share"
			);
			expect(share).toMatchObject({
				kind: "label",
				text: `${Math.round((matching.length / inYears.length) * 100)}%`
			});
		});

		it("reads 0% with no progression and 100% when all songs match", () => {
			const textOf = (overrides: Partial<ProgressionOverTimeParams>) =>
				(
					run(crowdedSnapshot(), {
						highlight,
						...overrides
					}).layout.guides!.find(
						(g) => idOf(g) === "progressionOverTime:highlight:share"
					) as { text: string }
				).text;
			expect(textOf({ progression: null })).toBe("0%");
			expect(textOf({ progression: "I V vi IV" })).toBe("100%");
		});

		it("covers the highlighted years' columns, within the frame", () => {
			const { layout } = run(crowdedSnapshot(), { highlight });
			const box = layout.guides!.find(
				(g) => idOf(g) === "progressionOverTime:highlight"
			) as { x: number; width: number };
			expect(box.x).toBeGreaterThan(0);
			expect(box.width).toBeGreaterThan(0);
			expect(box.x + box.width).toBeLessThanOrEqual(1);
		});

		it("has no highlight guides when highlight is null", () => {
			const { layout } = run(crowdedSnapshot(), { highlight: null });
			const ids = idsOf(layout.guides!);
			expect(ids).not.toContain("progressionOverTime:highlight");
			expect(ids).not.toContain("progressionOverTime:highlight:share");
			expect(ids.some((id) => id?.startsWith("progressionOverTime:y:"))).toBe(
				true
			);
		});
	});
});
