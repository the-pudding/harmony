import { describe, expect, it } from "vitest";
import { formatChordName } from "../../../chord-processing/formatChordDisplay.js";
import {
	CHORD_WINDOW_SECONDS,
	chordOfNotes,
	joinsChordChange
} from "./chordRecording.js";

const A_MAJOR = { tonic: "A", scale: "major" } as const;
const nameOf = (midis: number[]) => {
	const chord = chordOfNotes(midis, A_MAJOR);
	return chord && formatChordName(chord);
};

// MIDI: A2 = 45, C#3 = 49, E3 = 52, F#2 = 42, D3 = 50, A3 = 57, G3 = 55.
describe("chordOfNotes", () => {
	it("names the chord the notes spell", () => {
		expect(nameOf([45, 49, 52])).toBe("A");
		expect(nameOf([45, 57, 61, 64])).toBe("A");
		expect(nameOf([42, 50, 54, 57])).toBe("D / F#");
		expect(nameOf([40, 56, 59, 62])).toBe("E 7");
	});

	it("takes a lone bass note as the chord on it in the key", () => {
		expect(nameOf([42])).toBe("F#m");
		expect(nameOf([50])).toBe("D");
		expect(nameOf([45, 52])).toBe("A");
	});

	it("is null with nothing held", () => {
		expect(chordOfNotes([], A_MAJOR)).toBeNull();
	});
});

describe("joinsChordChange", () => {
	it("groups notes played within the chord window", () => {
		expect(joinsChordChange(undefined, 1)).toBe(false);
		expect(joinsChordChange(1, 1 + CHORD_WINDOW_SECONDS / 2)).toBe(true);
		expect(joinsChordChange(1, 1 + CHORD_WINDOW_SECONDS * 2)).toBe(false);
		expect(joinsChordChange(2, 1)).toBe(false);
	});
});
