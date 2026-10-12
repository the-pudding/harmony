import { describe, expect, it } from "vitest";
import coreProgressions from "../../../../data/core-progressions.js";
import {
	ROW_CHORD_RADIUS,
	buildTopProgressions,
	progressionTokensOf,
	rowChordCenterX
} from "./topProgressions.js";

const namedCore = coreProgressions[0];
const coreMatch = {
	name: namedCore.name,
	chordProgression: "V-I-V-I",
	isCore: true
};
const gapFillMatch = {
	name: "vi-IV",
	chordProgression: "vi-IV",
	isCore: false
};
const rareMatch = { name: "ii-V", chordProgression: "ii-V", isCore: false };

const songs = [
	{ progressionCounts: [coreMatch, coreMatch, gapFillMatch] },
	{ progressionCounts: [coreMatch, gapFillMatch] },
	{ progressionCounts: [coreMatch, rareMatch] }
];

describe("buildTopProgressions", () => {
	it("ranks progressions by how many songs match them, counting each song once", () => {
		expect(
			buildTopProgressions(songs).map(({ name, songCount }) => [
				name,
				songCount
			])
		).toEqual([
			[namedCore.name, 3],
			["vi-IV", 2],
			["ii-V", 1]
		]);
	});

	it("labels core progressions by name with their authored spelling", () => {
		const [top] = buildTopProgressions(songs);
		expect(top.label).toBe(namedCore.name);
		expect(top.tokens.map((token) => token.roman).join("-")).toBe(
			[namedCore.chordProgression].flat()[0]
		);
	});

	it("labels non-core progressions by their chords", () => {
		expect(buildTopProgressions(songs)[1].label).toBe("vi-IV");
	});

	it("respects the limit", () => {
		expect(buildTopProgressions(songs, 1)).toHaveLength(1);
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
