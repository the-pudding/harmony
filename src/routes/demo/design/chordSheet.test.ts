import { describe, expect, it } from "vitest";
import { groupSongs } from "$data/songBrowser.js";
import { formatChordName } from "../../../chord-processing/formatChordDisplay.js";
import { buildChordSheet } from "./chordSheet.js";

const section = (label: string, names: [string, string][]) => ({
	songKey: "artist__song",
	title: `Song (${label})`,
	artists: ["Artist"],
	progression: names.map(([noteName, suffix]) => ({ noteName, suffix }))
});

const short: [string, string][] = [
	["A", "major"],
	["F#", "minor"],
	["D", "major"],
	["E", "major"]
];

describe("buildChordSheet", () => {
	it("lists sections with the same chords once, under every label", () => {
		const [song] = groupSongs([
			section("Verse 1", short),
			section("Chorus", [
				["D", "major"],
				["E", "major"]
			]),
			section("Verse 2", short)
		]);
		const sheet = buildChordSheet(song.sections);
		expect(
			sheet.map(({ labels, chords }) => [labels, chords.map(formatChordName)])
		).toEqual([
			[
				["Verse 1", "Verse 2"],
				["A", "F#m", "D", "E"]
			],
			[["Chorus"], ["D", "E"]]
		]);
	});
});
