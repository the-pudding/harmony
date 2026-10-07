import { describe, expect, it } from "vitest";
import {
	buildEvenlySpacedChordTimeline,
	isActiveAt,
	progressFractionOf,
	type SongSectionChords
} from "./chordTimeline.js";

const chord = (name: string) => ({ name, roman: name });
const palette = { fill: "fill", border: "border" };

const sections: SongSectionChords[] = [
	{
		id: "verse",
		name: "Verse",
		chords: [chord("C"), chord("Am"), chord("F")],
		groups: [
			{
				startIndex: 1,
				length: 2,
				palette,
				chordProgression: "vi IV",
				isStrictSubset: false
			}
		]
	},
	{ id: "chorus", name: "Chorus", chords: [chord("G")], groups: [] }
];

describe("buildEvenlySpacedChordTimeline", () => {
	it("gives every chord an equal share of the song", () => {
		const { chords } = buildEvenlySpacedChordTimeline(sections);
		expect(chords.map((c) => [c.startFraction, c.endFraction])).toEqual([
			[0, 0.25],
			[0.25, 0.5],
			[0.5, 0.75],
			[0.75, 1]
		]);
	});

	it("spans each section across its chords", () => {
		const timeline = buildEvenlySpacedChordTimeline(sections);
		expect(
			timeline.sections.map((s) => [s.name, s.startFraction, s.endFraction])
		).toEqual([
			["Verse", 0, 0.75],
			["Chorus", 0.75, 1]
		]);
	});

	it("spans each matched group across its chords", () => {
		const { groups } = buildEvenlySpacedChordTimeline(sections);
		expect(groups.map((g) => [g.startFraction, g.endFraction])).toEqual([
			[0.25, 0.75]
		]);
	});

	it("colors only the chords inside a matched group", () => {
		const { chords } = buildEvenlySpacedChordTimeline(sections);
		expect(chords.map((c) => c.palette)).toEqual([
			null,
			palette,
			palette,
			null
		]);
	});

	it("returns an empty timeline when there are no chords", () => {
		expect(buildEvenlySpacedChordTimeline([])).toEqual({
			chords: [],
			groups: [],
			sections: []
		});
	});
});

describe("isActiveAt", () => {
	const span = { startFraction: 0.25, endFraction: 0.5 };

	it("includes the start and excludes the end", () => {
		expect(isActiveAt(span, 0.25)).toBe(true);
		expect(isActiveAt(span, 0.49)).toBe(true);
		expect(isActiveAt(span, 0.5)).toBe(false);
	});
});

describe("progressFractionOf", () => {
	it("returns 0 until the duration is known", () => {
		expect(progressFractionOf(10, NaN)).toBe(0);
		expect(progressFractionOf(10, 0)).toBe(0);
	});

	it("divides current time by duration, capped at 1", () => {
		expect(progressFractionOf(30, 120)).toBe(0.25);
		expect(progressFractionOf(130, 120)).toBe(1);
	});
});
