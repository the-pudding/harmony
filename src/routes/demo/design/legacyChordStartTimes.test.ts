import { describe, expect, it } from "vitest";
import type { SongSectionChords } from "./chordTimeline.js";
import { migrateLegacyChordStartTimes } from "./legacyChordStartTimes.js";

const chord = (name: string) => ({ name, roman: name });

const sections: SongSectionChords[] = [
	{
		id: "a",
		name: "Chorus",
		chords: [chord("A"), chord("D"), chord("E")],
		groups: []
	},
	{ id: "b", name: "Verse", chords: [chord("A")], groups: [] }
];

describe("migrateLegacyChordStartTimes", () => {
	it("derives song start and tempo from the opening section", () => {
		expect(
			migrateLegacyChordStartTimes(
				{ "a-0": 1, "a-1": 3, "a-2": 5, "b-0": 99 },
				sections
			)
		).toEqual({
			startSeconds: 1,
			beatsPerMinute: 60,
			endSongAtBeat: null,
			chordBeats: [0, 2, 4, 6]
		});
	});

	it("returns null when the opening section is not timed", () => {
		expect(migrateLegacyChordStartTimes({}, sections)).toBeNull();
	});
});
