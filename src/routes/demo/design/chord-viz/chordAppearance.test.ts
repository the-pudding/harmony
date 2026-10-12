import { describe, expect, it } from "vitest";
import { CHORD_APPEARANCE } from "./chordAppearance.js";
import { appearanceFor } from "./chordAppearanceLookup.js";
import {
	CHORD_PALETTES,
	DEFAULT_PALETTE,
	DEFAULT_PALETTE_ID,
	colorOf,
	paletteById
} from "./chordPalettes.js";
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

	it("every color reference resolves in every palette", () => {
		for (const { palette } of CHORD_PALETTES) {
			for (const entries of Object.values(CHORD_APPEARANCE)) {
				for (const entry of Object.values(entries)) {
					expect(colorOf(palette, entry.color)).toBeDefined();
				}
			}
		}
	});

	it("minor chords in a major key use the minor (purple) palette family", () => {
		const majorRow = CHORD_VIZ_ROWS.find((row) => row.tonality === "major");
		const minorChords =
			majorRow?.chords.filter((chord) => chord.tone === "minor") ?? [];
		expect(minorChords.length).toBeGreaterThan(0);
		for (const chord of minorChords) {
			expect(CHORD_APPEARANCE.major[chord.roman].color.family).toBe("minor");
		}
	});
});

describe("paletteById", () => {
	it("returns the matching palette, falling back to the first", () => {
		expect(paletteById(DEFAULT_PALETTE_ID)).toBe(DEFAULT_PALETTE);
		expect(paletteById("missing")).toBe(CHORD_PALETTES[0].palette);
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
