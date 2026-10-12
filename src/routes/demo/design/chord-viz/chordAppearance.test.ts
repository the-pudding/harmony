import { describe, expect, it } from "vitest";
import { CHORD_APPEARANCE } from "./chordAppearance.js";
import { appearanceFor } from "./chordAppearanceLookup.js";
import { DEFAULT_PALETTE } from "./chordPalettes.js";
import { CHORD_SHAPE_PATHS } from "./chordShapes.js";
import { CHORD_VIZ_ROWS } from "./diatonicChords.js";

describe("CHORD_SHAPE_PATHS", () => {
	it("every shape path is a valid SVG path starting with M", () => {
		for (const path of Object.values(CHORD_SHAPE_PATHS)) {
			expect(path).toMatch(/^M/);
		}
	});
});

describe("CHORD_APPEARANCE", () => {
	it("every chord in CHORD_VIZ_ROWS has an explicit spec entry", () => {
		for (const row of CHORD_VIZ_ROWS) {
			for (const chord of row.chords) {
				expect(CHORD_APPEARANCE[row.tonality][chord.roman]).toBeDefined();
			}
		}
	});

	it("every color quality used in major resolves in DEFAULT_PALETTE", () => {
		for (const entry of Object.values(CHORD_APPEARANCE.major)) {
			const color = entry.color as keyof typeof DEFAULT_PALETTE.major;
			expect(DEFAULT_PALETTE.major[color]).toBeDefined();
		}
	});

	it("every color quality used in minor resolves in DEFAULT_PALETTE", () => {
		for (const entry of Object.values(CHORD_APPEARANCE.minor)) {
			const color = entry.color as keyof typeof DEFAULT_PALETTE.minor;
			expect(DEFAULT_PALETTE.minor[color]).toBeDefined();
		}
	});
});

describe("appearanceFor", () => {
	it("returns the correct shape and colors for a known major chord", () => {
		const appearance = appearanceFor("major", "I");
		expect(appearance.path).toBe(CHORD_SHAPE_PATHS.stableTriangle);
		expect(appearance.colors).toBe(DEFAULT_PALETTE.major.home);
	});

	it("returns the correct shape and colors for a known minor chord", () => {
		const appearance = appearanceFor("minor", "i");
		expect(appearance.path).toBe(CHORD_SHAPE_PATHS.stableTriangle);
		expect(appearance.colors).toBe(DEFAULT_PALETTE.minor.home);
	});

	it("returns a fallback for an unknown roman numeral", () => {
		const appearance = appearanceFor("major", "bVII");
		expect(appearance.path).toBe(CHORD_SHAPE_PATHS.circleish);
		expect(appearance.colors).toBe(DEFAULT_PALETTE.major.home);
	});

	it("returns a path string for every chord in CHORD_VIZ_ROWS", () => {
		for (const row of CHORD_VIZ_ROWS) {
			for (const chord of row.chords) {
				const appearance = appearanceFor(row.tonality, chord.roman);
				expect(appearance.path).toMatch(/^M/);
				expect(appearance.colors.fill).toBeTruthy();
				expect(appearance.colors.text).toBeTruthy();
			}
		}
	});
});
