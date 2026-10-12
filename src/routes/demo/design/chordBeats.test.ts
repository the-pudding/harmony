import { describe, expect, it } from "vitest";
import {
	beatGridSeconds,
	beatToSeconds,
	chordCountBeforeBeat,
	chordStartSeconds,
	moveChordBeat,
	resolveChordBeats,
	secondsToBeat
} from "./chordBeats.js";

const alignment = { startSeconds: 1, beatsPerMinute: 60 };

describe("beat ↔ seconds", () => {
	it("offsets by the song start and scales by tempo", () => {
		expect(beatToSeconds(alignment, 4)).toBe(5);
		expect(secondsToBeat(alignment, 5)).toBe(4);
		expect(beatToSeconds({ startSeconds: 0, beatsPerMinute: 120 }, 4)).toBe(2);
	});
});

describe("resolveChordBeats", () => {
	it("defaults every chord to two beats after the previous one", () => {
		expect(resolveChordBeats(3, [])).toEqual([0, 2, 4]);
	});

	it("keeps saved beats and fills gaps after them", () => {
		expect(resolveChordBeats(4, [0, 3])).toEqual([0, 3, 5, 7]);
	});

	it("keeps saved beats in chord order", () => {
		expect(resolveChordBeats(3, [4, 2, 6])).toEqual([4, 5, 6]);
	});
});

describe("moveChordBeat", () => {
	const beats = [0, 2, 4, 6];

	it("snaps to the nearest beat", () => {
		expect(moveChordBeat(beats, 1, 2.6)).toEqual([0, 3, 4, 6]);
	});

	it("pushes neighbors to preserve chord order", () => {
		expect(moveChordBeat(beats, 1, 5)).toEqual([0, 5, 6, 7]);
		expect(moveChordBeat(beats, 2, 0.4)).toEqual([0, 1, 2, 6]);
	});
});

describe("chordStartSeconds", () => {
	it("maps every chord beat onto the song", () => {
		expect(
			chordStartSeconds({
				...alignment,
				endSongAtBeat: null,
				chordBeats: [0, 2]
			})
		).toEqual([1, 3]);
	});
});

describe("chordCountBeforeBeat", () => {
	it("counts chords starting before the end beat", () => {
		expect(chordCountBeforeBeat([0, 2, 4, 6], 4)).toBe(2);
		expect(chordCountBeforeBeat([0, 2, 4, 6], null)).toBe(4);
	});
});

describe("beatGridSeconds", () => {
	it("lists every beat inside the song, including before the start", () => {
		expect(
			beatGridSeconds({ startSeconds: 1.5, beatsPerMinute: 60 }, 4)
		).toEqual([0.5, 1.5, 2.5, 3.5]);
	});
});
