import { describe, expect, it } from "vitest";
import coreProgressions from "../../../../data/core-progressions.js";
import {
	DEFAULT_PROGRESSION_FILTERS,
	ROW_CHORD_RADIUS,
	isMinorKey,
	progressionTokensOf,
	rankProgressions,
	selectTopProgressions,
	rowChordCenterX
} from "./topProgressions.js";

const namedCore = coreProgressions[0];
const coreMatch = {
	name: namedCore.name,
	chordProgression: "V-I-V-I",
	scale: "minor" as const,
	isCore: true
};
const gapFillMatch = {
	name: "vi-IV",
	chordProgression: "vi-IV",
	scale: "major" as const,
	isCore: false
};
const rareMatch = {
	name: "i-iv",
	chordProgression: "i-iv",
	scale: "minor" as const,
	isCore: false
};

const songs = [
	{ progressionCounts: [coreMatch, coreMatch, gapFillMatch] },
	{ progressionCounts: [coreMatch, gapFillMatch] },
	{ progressionCounts: [coreMatch, rareMatch] }
];

describe("rankProgressions", () => {
	it("ranks progressions by how many songs match them, counting each song once", () => {
		expect(
			rankProgressions(songs).map(({ name, songCount }) => [name, songCount])
		).toEqual([
			[namedCore.name, 3],
			["vi-IV", 2],
			["i-iv", 1]
		]);
	});

	it("labels core progressions by name with their authored spelling", () => {
		const [top] = rankProgressions(songs);
		expect(top.label).toBe(namedCore.name);
		expect(top.variants.map(({ spelling }) => spelling)).toEqual([
			namedCore.chordProgression
		]);
		expect(top.variants[0].songCount).toBe(3);
	});

	it("counts songs per authored variant, simplifying extensions and repeats", () => {
		const jazzMatch = (chordProgression: string) => ({
			name: "jazz ii-V-I",
			chordProgression,
			scale: "major" as const,
			isCore: true
		});
		const [ranked] = rankProgressions([
			{ progressionCounts: [jazzMatch("ii7-V7-Imaj7")] },
			{ progressionCounts: [jazzMatch("ii-ii7-V-I")] },
			{ progressionCounts: [jazzMatch("ii-bII-I")] }
		]);
		expect(
			ranked.variants.map(({ spelling, songCount }) => [spelling, songCount])
		).toEqual([
			["ii-V-I", 2],
			["ii-bII-I", 1]
		]);
	});

	it("keeps one variant when no song matches any authored spelling", () => {
		const [ranked] = rankProgressions([
			{
				progressionCounts: [
					{
						name: "jazz ii-V-I",
						chordProgression: "vi-ii-V",
						scale: "major",
						isCore: true
					}
				]
			}
		]);
		expect(ranked.variants).toHaveLength(1);
	});

	it("labels non-core progressions by their chords", () => {
		expect(rankProgressions(songs)[1].label).toBe("vi-IV");
	});

	it("uses the authored core scale rather than the matched one", () => {
		expect(rankProgressions(songs)[0].scale).toBe(namedCore.scale);
	});
});

describe("selectTopProgressions", () => {
	const ranked = rankProgressions(songs);
	const namesFor = (filters: typeof DEFAULT_PROGRESSION_FILTERS) =>
		selectTopProgressions(ranked, filters).map(({ name }) => name);

	it("keeps everything with the default filters", () => {
		expect(namesFor(DEFAULT_PROGRESSION_FILTERS)).toHaveLength(ranked.length);
	});

	it("respects the limit", () => {
		expect(
			selectTopProgressions(ranked, DEFAULT_PROGRESSION_FILTERS, 1)
		).toHaveLength(1);
	});

	it("can require at least one minor chord", () => {
		expect(
			namesFor({ ...DEFAULT_PROGRESSION_FILTERS, requiresMinorChord: true })
		).toEqual(["vi-IV", "i-iv"]);
	});

	it("can require a minor key", () => {
		expect(
			namesFor({ ...DEFAULT_PROGRESSION_FILTERS, requiresMinorKey: true })
		).toEqual(["i-iv"]);
	});
});

describe("isMinorKey", () => {
	it("treats scales with a minor tonic chord as minor keys", () => {
		expect(isMinorKey("minor")).toBe(true);
		expect(isMinorKey("dorian")).toBe(true);
		expect(isMinorKey("major")).toBe(false);
		expect(isMinorKey("mixolydian")).toBe(false);
	});
});

describe("progressionTokensOf", () => {
	it("classifies major and minor chords, including borrowed and diminished", () => {
		expect(progressionTokensOf("I-bVII-vi-vii°")).toEqual([
			{ roman: "I", tone: "major" },
			{ roman: "bVII", tone: "major" },
			{ roman: "vi", tone: "minor" },
			{ roman: "vii°", tone: "minor" }
		]);
	});
});

describe("rowChordCenterX", () => {
	it("places neighboring chords close enough to overlap", () => {
		expect(rowChordCenterX(1) - rowChordCenterX(0)).toBeLessThan(
			2 * ROW_CHORD_RADIUS
		);
	});
});
