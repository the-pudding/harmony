import { describe, expect, it } from "vitest";
import {
	chordColor,
	CLUSTER_CHORD_PALETTE,
	paletteChordColors
} from "./chordColors.js";
import { hexToOklch, mixOklab } from "./oklab.js";
import { progressionChordsByName } from "./progressionChords.js";
import {
	createSignatureChordStrategy,
	SIGNATURE_FALLBACK_COLOR
} from "./strategies/signatureChord.js";
import { neighborDistinctStrategy } from "./strategies/neighborDistinct.js";
import type { ClusterColorInput } from "./types.js";

const cluster = (
	name: string,
	progressionNames: string[],
	x = 0
): ClusterColorInput => ({ name, progressionNames, x, y: 0, weight: 1 });

const fill = (key: keyof typeof CLUSTER_CHORD_PALETTE) =>
	CLUSTER_CHORD_PALETTE[key].colors.fill;

describe("progressionChordsByName", () => {
	it("reads core progressions with their key", () => {
		expect(progressionChordsByName("doo wop")).toEqual({
			tonality: "major",
			chords: ["I", "vi", "IV", "V"]
		});
	});

	it("reads non-core names as roman numerals, inferring the key", () => {
		expect(progressionChordsByName("I-ii-I")?.tonality).toBe("major");
		expect(progressionChordsByName("i-IV-i")?.tonality).toBe("minor");
		expect(progressionChordsByName("III-VII-III")?.tonality).toBe("minor");
	});

	it("is null for names that aren't chords", () => {
		expect(progressionChordsByName("not a progression")).toBeNull();
	});
});

describe("chordColor", () => {
	it("uses the palette's major colors as is", () => {
		expect(chordColor("major", "IV")).toBe(fill("major.IV"));
	});

	it("lifts minor colors to stay visible on the dark map", () => {
		const [lifted] = hexToOklch(chordColor("minor", "i")!);
		const [original] = hexToOklch(fill("minor.i"));
		expect(lifted).toBeGreaterThan(original);
		expect(chordColor("minor", "i", { minorLift: null })).toBe(fill("minor.i"));
	});

	it("reads minor-key flats as the key's own chords", () => {
		expect(chordColor("minor", "bVII")).toBe(chordColor("minor", "VII"));
	});

	it("is null for chords the palette doesn't color", () => {
		expect(chordColor("major", "bII")).toBeNull();
	});
});

describe("signature chord strategy", () => {
	const strategy = createSignatureChordStrategy();

	it("colors a cluster by its most telling non-tonic chord", () => {
		const colors = strategy([
			cluster("I-IV vamp", ["I-IV vamp"]),
			cluster("I-V vamp", ["I-V vamp"]),
			cluster("doo wop", ["doo wop"])
		]);
		expect(colors.get("I-IV vamp")).toBe(fill("major.IV"));
		expect(colors.get("I-V vamp")).toBe(fill("major.V"));
		// IV and V are shared with the vamps; vi is doo wop's alone.
		expect(colors.get("doo wop")).toBe(fill("major.vi"));
	});

	it("colors minor clusters from the minor palette", () => {
		const colors = strategy([cluster("i iv vamp", ["i iv vamp"])]);
		expect(colors.get("i iv vamp")).toBe(chordColor("minor", "iv"));
	});

	it("blends a cluster built on several progressions", () => {
		const colors = strategy([
			cluster("mix", ["I-IV vamp", "I-V vamp"]),
			cluster("I-IV vamp", ["I-IV vamp"]),
			cluster("I-V vamp", ["I-V vamp"])
		]);
		expect(colors.get("mix")).toBe(
			mixOklab([fill("major.IV"), fill("major.V")])
		);
	});

	it("uses chords a fuller color source adds, like a minor-key IV", () => {
		const progressions = [cluster("i-IV-i", ["i-IV-i"])];
		expect(strategy(progressions).get("i-IV-i")).toBe(chordColor("minor", "i"));
		const withMinorIV = createSignatureChordStrategy({
			source: (tonality, roman) =>
				tonality === "minor" && roman === "IV"
					? "#ffffff"
					: paletteChordColors(CLUSTER_CHORD_PALETTE)(tonality, roman),
			minorLift: null
		});
		expect(withMinorIV(progressions).get("i-IV-i")).toBe("#ffffff");
	});

	it("falls back to a neutral color when no chords are known", () => {
		expect(strategy([cluster("?", ["unknown"])]).get("?")).toBe(
			SIGNATURE_FALLBACK_COLOR
		);
	});
});

describe("neighbor distinct strategy", () => {
	it("keeps nearby clusters apart", () => {
		const colors = neighborDistinctStrategy([
			cluster("a", [], 0),
			cluster("b", [], 0.01)
		]);
		expect(colors.get("a")).not.toBe(colors.get("b"));
	});
});
