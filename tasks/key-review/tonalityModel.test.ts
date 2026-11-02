import { describe, expect, it } from "vitest";
import { toPitchClass } from "./pitchClasses.js";
import {
	rankTonalities,
	tonalityOf,
	trainTonalityModel,
	type AbsoluteChord,
	type TrustedSong
} from "./tonalityModel.js";
import { assessSongKey, FLAG_REASONS } from "./assessSongKey.js";

const NO_CAPO = 0;

const chordsFrom = (names: string): AbsoluteChord[] =>
	names.split(" ").map((name) => ({
		rootPc: toPitchClass(name.replace(/m$/, "")),
		isMinor: name.endsWith("m")
	}));

const trustedSong = (
	key: string,
	scale: string,
	progressions: string[]
): TrustedSong => ({
	primary: tonalityOf(key, scale),
	sections: progressions.map((names) => ({
		chords: chordsFrom(names),
		tonality: tonalityOf(key, scale)
	}))
});

const trainingSongs: TrustedSong[] = [
	trustedSong("F", "major", ["F Bb C F", "F Dm Bb C F"]),
	trustedSong("C", "major", ["C F G C", "C Am F G C", "C G Am F C"]),
	trustedSong("G", "major", ["G C D G", "G Em C D G"]),
	trustedSong("A", "minor", ["Am Dm E Am", "Am F G Am", "Am G F E Am"]),
	trustedSong("E", "minor", ["Em Am B Em", "Em C D Em"]),
	trustedSong("G", "mixolydian", ["G F C G", "G F G", "G C F G"]),
	trustedSong("D", "mixolydian", ["D C G D", "D C D"])
];

const model = trainTonalityModel(trainingSongs);

describe("trainTonalityModel", () => {
	it("keeps the modes common in the trusted songs", () => {
		expect(model.modes).toEqual(["major", "minor", "mixolydian"]);
	});
});

describe("rankTonalities", () => {
	const best = (progressions: string[]) =>
		rankTonalities(model, progressions.map(chordsFrom))[0];

	it("finds a major key from its cadences", () => {
		expect(best(["D G A D", "D Bm G A D"])).toMatchObject({
			tonicPc: toPitchClass("D"),
			scale: "major"
		});
	});

	it("finds a minor key with a major V", () => {
		expect(best(["Dm Gm A Dm", "Dm Bb C Dm"])).toMatchObject({
			tonicPc: toPitchClass("D"),
			scale: "minor"
		});
	});

	it("finds mixolydian from I-bVII-IV", () => {
		expect(best(["A G D A", "A G A"])).toMatchObject({
			tonicPc: toPitchClass("A"),
			scale: "mixolydian"
		});
	});
});

describe("assessSongKey", () => {
	it("flags a song labeled in the key a fifth below its mixolydian tonic", () => {
		const assessment = assessSongKey(
			model,
			["A G D A", "A G A"].map(chordsFrom),
			tonalityOf("D", "major"),
			NO_CAPO
		);
		expect(assessment.reasons).toContain(FLAG_REASONS.betterFit);
	});

	it("does not flag a correctly labeled song", () => {
		const assessment = assessSongKey(
			model,
			["D G A D", "D Bm G A D"].map(chordsFrom),
			tonalityOf("D", "major"),
			NO_CAPO
		);
		expect(assessment.reasons).toEqual([]);
	});

	it("flags rare modes and large capo shifts", () => {
		const assessment = assessSongKey(
			model,
			["D G A D"].map(chordsFrom),
			tonalityOf("D", "lydian"),
			7
		);
		expect(assessment.reasons).toEqual(
			expect.arrayContaining([
				FLAG_REASONS.uncommonMode,
				FLAG_REASONS.capoShift
			])
		);
	});
});
