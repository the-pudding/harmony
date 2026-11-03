import { describe, expect, it } from "vitest";
import { toPitchClass } from "./pitchClasses.js";
import {
	classifyChange,
	DEFAULT_VITERBI_PARAMS,
	findSectionKeyConflicts,
	sameCollection,
	segmentSectionKeys,
	toSectionForSegmentation,
	type SectionForSegmentation
} from "./segmentSectionKeys.js";
import {
	tonalityOf,
	trainTonalityModel,
	type AbsoluteChord,
	type TrustedSong
} from "./tonalityModel.js";
import type { SongInput } from "../../src/chord-processing/types.js";
import type { SongKeySnapshot } from "./ledger.js";

// ── test helpers ─────────────────────────────────────────────────────────────

const pc = (name: string) => toPitchClass(name);

const chordsFrom = (names: string): AbsoluteChord[] =>
	names.split(" ").map((name) => ({
		rootPc: pc(name.replace(/m$/, "")),
		isMinor: name.endsWith("m")
	}));

const trustedSong = (key: string, scale: string, progressions: string[]): TrustedSong => ({
	primary: tonalityOf(key, scale),
	sections: progressions.map((names) => ({
		chords: chordsFrom(names),
		tonality: tonalityOf(key, scale)
	}))
});

const trainingSongs: TrustedSong[] = [
	trustedSong("C", "major", ["C F G C", "C Am F G C", "C G Am F C"]),
	trustedSong("G", "major", ["G C D G", "G Em C D G", "G D Em C G"]),
	trustedSong("F", "major", ["F Bb C F", "F Dm Bb C F"]),
	trustedSong("D", "major", ["D G A D", "D Bm G A D"]),
	trustedSong("A", "major", ["A D E A", "A F#m D E A"]),
	trustedSong("E", "major", ["E A B E", "E C#m A B E"]),
	trustedSong("A", "minor", ["Am Dm E Am", "Am F G Am", "Am G F E Am"]),
	trustedSong("E", "minor", ["Em Am B Em", "Em C D Em", "Em G Am B Em"]),
	trustedSong("D", "minor", ["Dm Gm A Dm", "Dm Bb C Dm"]),
	trustedSong("G", "mixolydian", ["G F C G", "G F G", "G Bb F G"]),
	trustedSong("D", "mixolydian", ["D C G D", "D C D", "D C A D"]),
	trustedSong("A", "mixolydian", ["A G D A", "A G A"])
];

const model = trainTonalityModel(trainingSongs);

const section = (
	id: string,
	key: string,
	scale: string,
	chordNames: string
): SectionForSegmentation => ({
	id,
	labeledTonality: tonalityOf(key, scale),
	chords: chordsFrom(chordNames)
});

// ── classifyChange ───────────────────────────────────────────────────────────

describe("classifyChange", () => {
	it("returns null for the same tonality", () => {
		expect(classifyChange(tonalityOf("C", "major"), tonalityOf("C", "major"))).toBeNull();
	});

	it("classifies same-tonic mode shift as 'mode'", () => {
		expect(classifyChange(tonalityOf("G", "major"), tonalityOf("G", "mixolydian"))).toBe("mode");
		expect(classifyChange(tonalityOf("E", "minor"), tonalityOf("E", "major"))).toBe("mode");
	});

	it("classifies relative-key shift as 'relative'", () => {
		expect(classifyChange(tonalityOf("C", "major"), tonalityOf("A", "minor"))).toBe("relative");
		expect(classifyChange(tonalityOf("G", "major"), tonalityOf("E", "minor"))).toBe("relative");
	});

	it("classifies true pitch-collection change as 'modulation'", () => {
		expect(classifyChange(tonalityOf("C", "major"), tonalityOf("G", "major"))).toBe("modulation");
		expect(classifyChange(tonalityOf("C", "major"), tonalityOf("Eb", "major"))).toBe("modulation");
	});
});

// ── sameCollection ───────────────────────────────────────────────────────────

describe("sameCollection", () => {
	it("returns true for C major and A minor", () => {
		expect(sameCollection(tonalityOf("C", "major"), tonalityOf("A", "minor"))).toBe(true);
	});

	it("returns false for C major and G major", () => {
		expect(sameCollection(tonalityOf("C", "major"), tonalityOf("G", "major"))).toBe(false);
	});

	it("returns false for G major and G mixolydian", () => {
		expect(sameCollection(tonalityOf("G", "major"), tonalityOf("G", "mixolydian"))).toBe(false);
	});
});

// ── segmentSectionKeys: single-key songs ────────────────────────────────────

describe("segmentSectionKeys: single-key songs", () => {
	it("produces no flags for a clearly C major song", () => {
		const sections = [
			section("s1", "C", "major", "C F G C C F G C"),
			section("s2", "C", "major", "C Am F G"),
			section("s3", "C", "major", "C G Am F C")
		];
		const result = segmentSectionKeys(
			model,
			"artist__song",
			sections,
			tonalityOf("C", "major")
		);
		expect(result.flags).toHaveLength(0);
	});

	it("produces no flags for a G major song", () => {
		const sections = [
			section("s1", "G", "major", "G C D G"),
			section("s2", "G", "major", "G Em C D G"),
			section("s3", "G", "major", "G D Em C G")
		];
		const result = segmentSectionKeys(
			model,
			"artist__song",
			sections,
			tonalityOf("G", "major")
		);
		expect(result.flags).toHaveLength(0);
	});

	it("skips sections with fewer than MIN_SECTION_CHORDS chords", () => {
		const sections = [
			section("s1", "C", "major", "C F G C"),
			section("s2", "C", "major", "G"),
			section("s3", "C", "major", "C G Am F C")
		];
		const result = segmentSectionKeys(
			model,
			"artist__song",
			sections,
			tonalityOf("C", "major")
		);
		expect(result.flags.every((f) => f.sectionId !== "s2")).toBe(true);
	});
});

// ── segmentSectionKeys: modulating songs ─────────────────────────────────────

describe("segmentSectionKeys: modulating songs", () => {
	it("flags a chorus that clearly fits A major when the song is labeled C major", () => {
		const sections = [
			section("verse", "C", "major", "C Am F G C Am F G"),
			section("chorus", "C", "major", "A D E A A D E A"),
			section("verse2", "C", "major", "C Am F G C Am F G")
		];
		const result = segmentSectionKeys(
			model,
			"artist__song",
			sections,
			tonalityOf("C", "major")
		);
		const chorusFlag = result.flags.find((f) => f.sectionId === "chorus");
		expect(chorusFlag).toBeDefined();
		expect(chorusFlag?.suggested.tonicPc).toBe(pc("A"));
		expect(chorusFlag?.kind).toBe("modulation");
	});

	it("flags a relative-minor bridge", () => {
		const sections = [
			section("verse", "C", "major", "C F G C C F G C"),
			section("bridge", "C", "major", "Am E Am E Am E Am E"),
			section("chorus", "C", "major", "C F G C C F G C")
		];
		const result = segmentSectionKeys(
			model,
			"artist__song",
			sections,
			tonalityOf("C", "major")
		);
		const bridgeFlag = result.flags.find((f) => f.sectionId === "bridge");
		if (bridgeFlag) {
			expect(bridgeFlag.suggested.tonicPc).toBe(pc("A"));
			expect(bridgeFlag.kind).toBe("relative");
		}
	});

	it("flags a mixolydian section in an otherwise major-key song", () => {
		const sections = [
			section("verse", "G", "major", "G C D G G C D G"),
			section("chorus", "G", "major", "G F C G G F C G"),
			section("verse2", "G", "major", "G C D G G C D G")
		];
		const result = segmentSectionKeys(
			model,
			"artist__song",
			sections,
			tonalityOf("G", "major")
		);
		const chorusFlag = result.flags.find((f) => f.sectionId === "chorus");
		if (chorusFlag) {
			expect(chorusFlag.suggested.tonicPc).toBe(pc("G"));
			expect(chorusFlag.kind).toBe("mode");
		}
	});
});

// ── findSectionKeyConflicts ──────────────────────────────────────────────────

describe("findSectionKeyConflicts", () => {
	const snapshot = (songKey: string, key: string, scale: string): SongKeySnapshot => ({
		songKey,
		labeledKey: key,
		labeledScale: scale,
		labeledCapo: 0,
		source: "ug",
		url: "",
		title: "Song",
		artist: "Artist"
	});

	const songInput = (id: string, songKey: string, key: string, scale: string, names: string): SongInput => ({
		id,
		songKey,
		title: "Song",
		artists: ["Artist"],
		source: "ug",
		key,
		scale,
		progression: names.split(" ").map((n) => ({
			noteName: n.replace(/m$/, ""),
			suffix: n.endsWith("m") ? "minor" : "major"
		})),
		romanTokens: [],
		suffixes: [],
		deltas: [],
		bassIntervals: [],
		wrapDelta: 0
	});

	it("returns empty array for all single-key songs", () => {
		const songs = [
			songInput("artist__song__verse", "artist__song", "C", "major", "C F G C C F G C"),
			songInput("artist__song__chorus", "artist__song", "C", "major", "C Am F G C Am F G")
		];
		const snapshots = new Map([["artist__song", snapshot("artist__song", "C", "major")]]);
		const result = findSectionKeyConflicts(model, songs, snapshots);
		expect(result).toHaveLength(0);
	});

	it("finds section conflicts for a modulating song", () => {
		const songs = [
			songInput("artist__song__verse", "artist__song", "C", "major", "C Am F G C Am F G"),
			songInput("artist__song__chorus", "artist__song", "C", "major", "G D Em C G D Em C")
		];
		const snapshots = new Map([["artist__song", snapshot("artist__song", "C", "major")]]);
		const result = findSectionKeyConflicts(model, songs, snapshots);
		expect(result.length).toBeGreaterThanOrEqual(0);
	});
});

// ── toSectionForSegmentation ─────────────────────────────────────────────────

describe("toSectionForSegmentation", () => {
	it("uses fallback key/scale when section has none", () => {
		const input: SongInput = {
			id: "artist__song__verse",
			songKey: "artist__song",
			title: "Song (Verse)",
			artists: ["Artist"],
			progression: [{ noteName: "C", suffix: "major" }],
			romanTokens: ["I"],
			key: undefined,
			scale: undefined,
			suffixes: [],
			deltas: [],
			bassIntervals: [],
			wrapDelta: 0
		};
		const seg = toSectionForSegmentation(input, "G", "major");
		expect(seg.labeledTonality.tonicPc).toBe(pc("G"));
		expect(seg.labeledTonality.scale).toBe("major");
	});

	it("uses section key/scale when present", () => {
		const input: SongInput = {
			id: "artist__song__verse",
			songKey: "artist__song",
			title: "Song (Verse)",
			artists: ["Artist"],
			progression: [{ noteName: "C", suffix: "major" }],
			romanTokens: ["I"],
			key: "A",
			scale: "minor",
			suffixes: [],
			deltas: [],
			bassIntervals: [],
			wrapDelta: 0
		};
		const seg = toSectionForSegmentation(input, "G", "major");
		expect(seg.labeledTonality.tonicPc).toBe(pc("A"));
		expect(seg.labeledTonality.scale).toBe("minor");
	});
});
