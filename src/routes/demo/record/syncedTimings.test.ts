import { describe, expect, it } from "vitest";
import { parseChordName } from "../../../chord-processing/formatChordDisplay.js";
import type { SongSectionChords } from "./chordTimeline.js";
import {
	buildSyncedChordTimeline,
	emptyTimings,
	fromSyncedSongFile,
	moveChordStart,
	moveRegionEdge,
	parseStoredTimings,
	punchInChords,
	removeChord,
	toSyncedSongFile,
	type RecordedChord
} from "./syncedTimings.js";

const A_MAJOR = { tonic: "A", scale: "major" } as const;
const song = { songKey: "artist__song", audioFile: "artist__song.mp3" };
const region = { startSeconds: 2, endSeconds: 12 };

const at = (seconds: number, name: string): RecordedChord => ({
	seconds,
	chord: parseChordName(name)!
});

const namesOf = (chords: RecordedChord[]) =>
	chords.map(({ seconds, chord }) => [seconds, chord.rootPitchClass]);

describe("synced song files", () => {
	it("round-trips timings with each chord's name and numeral", () => {
		const timings = {
			key: A_MAJOR,
			region,
			chords: [at(2, "A"), at(4, "F#m"), at(6, "D / F#"), at(8, "E 7")]
		};
		const file = toSyncedSongFile(song, timings, 30);
		expect(file).toEqual({
			...song,
			key: A_MAJOR,
			region,
			chords: [
				{ seconds: 2, chord: "A", roman: "I" },
				{ seconds: 4, chord: "F#m", roman: "vi" },
				{ seconds: 6, chord: "D / F#", roman: "IV/VI" },
				{ seconds: 8, chord: "E 7", roman: "V7" }
			]
		});
		expect(fromSyncedSongFile(file, A_MAJOR)).toEqual(timings);
	});

	it("resolves an open-ended region to the audio duration", () => {
		const file = toSyncedSongFile(song, emptyTimings(A_MAJOR), 30);
		expect(file.region).toEqual({ startSeconds: 0, endSeconds: 30 });
	});

	it("starts empty in the fallback key for a missing or invalid file", () => {
		expect(fromSyncedSongFile(undefined, A_MAJOR)).toEqual(
			emptyTimings(A_MAJOR)
		);
		expect(fromSyncedSongFile({ songKey: "x" }, A_MAJOR)).toEqual(
			emptyTimings(A_MAJOR)
		);
	});
});

describe("parseStoredTimings", () => {
	it("accepts timings saved by the page", () => {
		const timings = { ...emptyTimings(A_MAJOR), chords: [at(1, "A")] };
		expect(parseStoredTimings(JSON.parse(JSON.stringify(timings)))).toEqual(
			timings
		);
	});

	it("drops malformed timings, including the old per-section format", () => {
		expect(
			parseStoredTimings({ region: {}, chordStartSeconds: [] })
		).toBeNull();
		expect(
			parseStoredTimings({ ...emptyTimings(A_MAJOR), chords: [{ seconds: 1 }] })
		).toBeNull();
		expect(parseStoredTimings(null)).toBeNull();
	});
});

describe("punchInChords", () => {
	const base = [at(1, "A"), at(3, "F#m"), at(5, "D"), at(7, "E")];

	it("replaces what was recorded between the punch-in and punch-out", () => {
		expect(
			namesOf(punchInChords(base, [at(3.5, "B"), at(4.5, "C#")], 2.5, 6))
		).toEqual(namesOf([at(1, "A"), at(3.5, "B"), at(4.5, "C#"), at(7, "E")]));
	});

	it("keeps a played chord that repeats the one before it", () => {
		expect(
			namesOf(punchInChords(base, [at(2, "A"), at(3, "F#m")], 1.5, 4))
		).toEqual(
			namesOf([at(1, "A"), at(2, "A"), at(3, "F#m"), at(5, "D"), at(7, "E")])
		);
	});

	it("keeps repeats that were already there", () => {
		const repeats = [at(1, "A"), at(2, "A")];
		expect(punchInChords(repeats, [], 5, 6)).toEqual(repeats);
	});
});

describe("moveChordStart", () => {
	const chords = [at(3, "A"), at(5, "D"), at(7, "E")];

	it("clamps between neighbors and the region", () => {
		expect(moveChordStart(chords, 1, 9, region)[1].seconds).toBe(6.95);
		expect(moveChordStart(chords, 0, 0, region)[0].seconds).toBe(2);
		expect(moveChordStart(chords, 2, 20, region)[2].seconds).toBe(11.95);
	});

	it("returns the same chords when nothing moves", () => {
		expect(moveChordStart(chords, 1, 5, region)).toBe(chords);
	});
});

describe("removeChord", () => {
	it("drops one chord", () => {
		expect(removeChord([at(1, "A"), at(2, "D")], 0)).toEqual([at(2, "D")]);
	});
});

describe("moveRegionEdge", () => {
	it("keeps the region at least a second long and within the audio", () => {
		expect(moveRegionEdge(region, "start", 11.5, 30)).toEqual({
			startSeconds: 11,
			endSeconds: 12
		});
		expect(moveRegionEdge(region, "end", 40, 30)).toEqual({
			startSeconds: 2,
			endSeconds: 30
		});
	});
});

describe("buildSyncedChordTimeline", () => {
	const section: SongSectionChords = {
		id: "recorded",
		name: "",
		chords: [
			{ name: "A", roman: "I" },
			{ name: "D", roman: "IV" }
		],
		groups: []
	};

	it("lays chords over the view, the last lasting to the region end", () => {
		const timeline = buildSyncedChordTimeline(
			section,
			[at(2, "A"), at(7, "D")],
			region,
			{ startSeconds: 0, endSeconds: 20 }
		);
		expect(
			timeline.chords.map((c) => [
				c.name,
				c.roman,
				c.startFraction,
				c.endFraction
			])
		).toEqual([
			["A", "I", 0.1, 0.35],
			["D", "IV", 0.35, 0.6]
		]);
		expect(timeline.sections).toEqual([]);
	});

	it("is empty before anything is recorded", () => {
		expect(
			buildSyncedChordTimeline(section, [], region, region).chords
		).toEqual([]);
	});
});
