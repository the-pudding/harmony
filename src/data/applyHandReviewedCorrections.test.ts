import { describe, expect, it } from "vitest";
import { correctedSongContentsToSongInputs } from "./applyHandReviewedCorrections.js";
import { groupSongs } from "./songBrowser.js";
import type { CorrectedSongContents } from "./hand-reviewed-songs.js";

const DAMAGED_CONTENTS: CorrectedSongContents = {
	sections: [
		{
			name: "Refrain",
			key: "Eb",
			scale: "minor",
			romanTokens: ["i", "iv", "V", "VI", "iv", "V"]
		},
		{
			name: "Chorus",
			key: "Eb",
			scale: "minor",
			romanTokens: ["VI", "v", "iv", "VII", "VI", "v", "iv", "V"]
		}
	]
};

const MONTERO_CONTENTS: CorrectedSongContents = {
	sections: [
		{
			name: "Verse 1",
			key: "Eb",
			scale: "phrygianDominant",
			romanTokens: ["I", "II", "I", "II"]
		}
	]
};

const groupFrom = (id: string, contents: CorrectedSongContents) => {
	const inputs = correctedSongContentsToSongInputs(
		id,
		"Test Song",
		["Test Artist"],
		undefined,
		contents
	);
	return groupSongs(inputs);
};

describe("correctedSongContentsToSongInputs", () => {
	it("passes key and scale through to SongInput", () => {
		const [first] = correctedSongContentsToSongInputs(
			"danity-kane__damaged",
			"Damaged",
			["Danity Kane"],
			undefined,
			DAMAGED_CONTENTS
		);
		expect(first.key).toBe("Eb");
		expect(first.scale).toBe("minor");
	});

	it("uses section name for id and title", () => {
		const [first] = correctedSongContentsToSongInputs(
			"danity-kane__damaged",
			"Damaged",
			["Danity Kane"],
			undefined,
			DAMAGED_CONTENTS
		);
		expect(first.id).toBe("danity-kane__damaged__refrain");
		expect(first.title).toBe("Damaged (Refrain)");
	});

	it("throws on unknown scale", () => {
		const badContents: CorrectedSongContents = {
			sections: [
				{ name: "Verse", key: "C", scale: "nonsense", romanTokens: ["I"] }
			]
		};
		expect(() =>
			correctedSongContentsToSongInputs(
				"test",
				"Test",
				["Artist"],
				undefined,
				badContents
			)
		).toThrow("Unknown scale");
	});
});

describe("Damaged — Eb minor", () => {
	it("produces keyLabel 'Eb minor' on the grouped song", () => {
		const [song] = groupFrom("danity-kane__damaged", DAMAGED_CONTENTS);
		expect(song.keyLabel).toBe("Eb minor");
	});

	it("opens the Refrain with Ebm (not Cm)", () => {
		const [song] = groupFrom("danity-kane__damaged", DAMAGED_CONTENTS);
		const refrain = song.sections.find((s) => s.label === "Refrain");
		expect(refrain?.chords[0]).toBe("Ebm");
	});

	it("Refrain chord sequence is correct in Eb minor", () => {
		const [song] = groupFrom("danity-kane__damaged", DAMAGED_CONTENTS);
		const refrain = song.sections.find((s) => s.label === "Refrain");
		// i iv V VI iv V in Eb minor; NOTE_NAMES uses B (not Cb) for pc 11
		expect(refrain?.chords).toEqual(["Ebm", "Abm", "Bb", "B", "Abm", "Bb"]);
	});
});

describe("Good Days — E major with extended chords", () => {
	it("preserves maj7 and minor7 suffixes from hand-reviewed roman tokens", () => {
		const [song] = groupFrom("sza__good-days", {
			sections: [
				{
					name: "Intro",
					key: "E",
					scale: "major",
					romanTokens: ["Imaj7", "vi7"]
				},
				{
					name: "Pre-Chorus",
					key: "E",
					scale: "major",
					romanTokens: ["IVmaj7", "Vsus4", "ii°"]
				}
			]
		});

		const intro = song.sections.find((section) => section.label === "Intro");
		expect(intro?.romanTokens).toEqual(["Imaj7", "vi7"]);
		expect(intro?.parsedProgression.map((chord) => chord.suffix)).toEqual([
			"maj7",
			"minor7"
		]);
		expect(intro?.chords).toEqual(["E maj7", "C#m7"]);

		const preChorus = song.sections.find(
			(section) => section.label === "Pre-Chorus"
		);
		expect(preChorus?.parsedProgression.map((chord) => chord.suffix)).toEqual([
			"maj7",
			"sus4",
			"diminished"
		]);
	});
});

describe("Montero — Eb phrygian dominant", () => {
	it("produces keyLabel 'Eb phrygian dominant' on the grouped song", () => {
		const [song] = groupFrom("lil-nas-x__montero", MONTERO_CONTENTS);
		expect(song.keyLabel).toBe("Eb phrygian dominant");
	});

	it("Verse 1 starts with the I chord (Eb major) in Eb phrygian dominant", () => {
		const [song] = groupFrom("lil-nas-x__montero", MONTERO_CONTENTS);
		const verse = song.sections.find((s) => s.label === "Verse 1");
		expect(verse?.chords[0]).toBe("Eb");
	});
});
