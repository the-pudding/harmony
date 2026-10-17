import { describe, expect, it } from "vitest";
import { appearanceFor } from "./chordAppearanceLookup.js";
import {
	CHORD_PALETTES,
	DEFAULT_PALETTE,
	DEFAULT_PALETTE_ID,
	DIATONIC_CHORD_IDS,
	paletteById,
	styleOf
} from "./chordPalettes.js";
import { CHORD_SHAPE_PATHS } from "./chordShapes.js";
import { CHORD_VIZ_ROWS, chordIdOf } from "./diatonicChords.js";

describe("CHORD_SHAPE_PATHS", () => {
	it("every shape path is a valid SVG path starting with M", () => {
		for (const path of Object.values(CHORD_SHAPE_PATHS)) {
			expect(path).toMatch(/^M/);
		}
	});
});

describe("chord palettes", () => {
	it("every palette specifies color and shape for every diatonic chord id", () => {
		for (const { palette } of CHORD_PALETTES) {
			for (const chordId of DIATONIC_CHORD_IDS) {
				const style = palette[chordId];
				expect(style).toBeDefined();
				expect(style.shape in CHORD_SHAPE_PATHS).toBe(true);
				expect(style.colors.fill).toBeTruthy();
				expect(style.colors.text).toBeTruthy();
			}
		}
	});

	it("uses major.* / minor.* chord ids derived from viz rows", () => {
		expect(DIATONIC_CHORD_IDS).toContain("major.I");
		expect(DIATONIC_CHORD_IDS).toContain("minor.III");
		expect(DIATONIC_CHORD_IDS).toHaveLength(
			CHORD_VIZ_ROWS.reduce((count, row) => count + row.chords.length, 0)
		);
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
		expect(appearance.colors).toBe(DEFAULT_PALETTE["major.I"].colors);
	});

	it("returns the correct shape and colors for a known minor chord", () => {
		const appearance = appearanceFor("minor", "i");
		expect(appearance.path).toBe(CHORD_SHAPE_PATHS.stableTriangle);
		expect(appearance.colors).toBe(DEFAULT_PALETTE["minor.i"].colors);
	});

	it("returns a fallback for an unknown roman numeral", () => {
		const appearance = appearanceFor("major", "bVII");
		expect(appearance.path).toBe(CHORD_SHAPE_PATHS.stableTriangle);
		expect(appearance.colors).toBe(DEFAULT_PALETTE["major.I"].colors);
	});

	it("returns a path string for every chord in CHORD_VIZ_ROWS", () => {
		for (const row of CHORD_VIZ_ROWS) {
			for (const chord of row.chords) {
				const appearance = appearanceFor(row.tonality, chord.roman);
				expect(appearance.path).toMatch(/^M/);
				expect(appearance.colors.fill).toBeTruthy();
				expect(appearance.colors.text).toBeTruthy();
				expect(styleOf(DEFAULT_PALETTE, row.tonality, chord.roman)).toBe(
					DEFAULT_PALETTE[chordIdOf(row.tonality, chord.roman)]
				);
			}
		}
	});
});
