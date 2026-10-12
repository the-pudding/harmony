import { describe, expect, it } from "vitest";
import { DEFAULT_BEATS_PER_MINUTE } from "./chordBeats.js";
import {
	fromChordBeatsFile,
	isChordBeatsFile,
	toChordBeatsFile
} from "./chordBeatsFile.js";
import type { SongSectionChords } from "./chordTimeline.js";

const chord = (name: string) => ({ name, roman: name });

const sections: SongSectionChords[] = [
	{ id: "a", name: "Verse", chords: [chord("C"), chord("G")], groups: [] },
	{ id: "b", name: "Chorus", chords: [chord("F")], groups: [] }
];

const timings = {
	startSeconds: 1.5,
	beatsPerMinute: 90,
	chordBeats: [0, 2, 6]
};

describe("chord beats file", () => {
	it("groups chord beats by section", () => {
		expect(toChordBeatsFile(timings, sections)).toEqual({
			startSeconds: 1.5,
			beatsPerMinute: 90,
			sections: [
				{ name: "Verse", chordBeats: [0, 2] },
				{ name: "Chorus", chordBeats: [6] }
			]
		});
	});

	it("round-trips through the file format", () => {
		expect(
			fromChordBeatsFile(toChordBeatsFile(timings, sections), sections)
		).toEqual(timings);
	});

	it("fills chords missing from the file", () => {
		const file = {
			startSeconds: 1,
			beatsPerMinute: 100,
			sections: [{ name: "Verse", chordBeats: [0, 4] }]
		};
		expect(fromChordBeatsFile(file, sections).chordBeats).toEqual([0, 4, 6]);
	});

	it("falls back to defaults for invalid files", () => {
		expect(isChordBeatsFile({})).toBe(false);
		expect(fromChordBeatsFile({}, sections)).toEqual({
			startSeconds: 0,
			beatsPerMinute: DEFAULT_BEATS_PER_MINUTE,
			chordBeats: [0, 2, 4]
		});
	});
});
