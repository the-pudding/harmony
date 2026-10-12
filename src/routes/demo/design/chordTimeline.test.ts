import { describe, expect, it } from "vitest";
import {
	buildChordTimeline,
	buildEvenlySpacedChordTimeline,
	chordKeysOf,
	isActiveAt,
	progressFractionOf,
	sectionChordIndices,
	truncateSectionsToChordCount,
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

	it("numbers chords in song order", () => {
		const { chords } = buildEvenlySpacedChordTimeline(sections);
		expect(chords.map((c) => c.index)).toEqual([0, 1, 2, 3]);
	});

	it("returns an empty timeline when there are no chords", () => {
		expect(buildEvenlySpacedChordTimeline([])).toEqual({
			chords: [],
			groups: [],
			sections: []
		});
	});
});

describe("buildChordTimeline", () => {
	const startFractions = [0, 0.1, 0.5, 0.9];

	it("ends each chord where the next one starts", () => {
		const { chords } = buildChordTimeline(sections, startFractions);
		expect(chords.map((c) => [c.startFraction, c.endFraction])).toEqual([
			[0, 0.1],
			[0.1, 0.5],
			[0.5, 0.9],
			[0.9, 1]
		]);
	});

	it("spans sections and groups across their chord start times", () => {
		const timeline = buildChordTimeline(sections, startFractions);
		expect(
			timeline.sections.map((s) => [s.startFraction, s.endFraction])
		).toEqual([
			[0, 0.9],
			[0.9, 1]
		]);
		expect(
			timeline.groups.map((g) => [g.startFraction, g.endFraction])
		).toEqual([[0.1, 0.9]]);
	});
});

describe("chordKeysOf", () => {
	it("keys every chord by section and position", () => {
		expect(chordKeysOf(sections)).toEqual([
			"verse-0",
			"verse-1",
			"verse-2",
			"chorus-0"
		]);
	});
});

describe("truncateSectionsToChordCount", () => {
	it("keeps only the first chords, dropping empty sections and clipping groups", () => {
		const truncated = truncateSectionsToChordCount(sections, 2);
		expect(truncated.map((s) => s.chords.map((c) => c.name))).toEqual([
			["C", "Am"]
		]);
		expect(truncated[0].groups.map((g) => [g.startIndex, g.length])).toEqual([
			[1, 1]
		]);
	});
});

describe("sectionChordIndices", () => {
	it("returns the song-wide positions of a section's chords", () => {
		expect(sectionChordIndices(sections, "verse")).toEqual([0, 1, 2]);
		expect(sectionChordIndices(sections, "chorus")).toEqual([3]);
		expect(sectionChordIndices(sections, "missing")).toEqual([]);
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
