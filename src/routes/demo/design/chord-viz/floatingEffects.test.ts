import { describe, expect, it } from "vitest";
import {
	ABRUPT_STOPS,
	RAINBOW_STOPS,
	fillFor,
	labelColorFor,
	radialStopsFor
} from "./floatingEffects.js";
import { CHORD_TONE_COLORS } from "./watercolor.js";

const PREFIX = "gradient-test";

describe("fillFor", () => {
	it("uses the chord tone color when no gradient is selected", () => {
		expect(fillFor(PREFIX, "none", "major")).toBe(CHORD_TONE_COLORS.major.fill);
	});

	it("uses a per-tone radial gradient for the sphere effect", () => {
		expect(fillFor(PREFIX, "radial", "minor")).toBe(
			`url(#${PREFIX}-radial-minor)`
		);
	});

	it("shares one gradient across tones for the other effects", () => {
		expect(fillFor(PREFIX, "rainbow", "major")).toBe(
			fillFor(PREFIX, "rainbow", "minor")
		);
	});
});

describe("labelColorFor", () => {
	it("keeps tone label colors only for tone-colored fills", () => {
		expect(labelColorFor("radial", "minor")).toBe(CHORD_TONE_COLORS.minor.text);
		expect(labelColorFor("rainbow", "minor")).not.toBe(
			CHORD_TONE_COLORS.minor.text
		);
	});
});

describe("gradient stops", () => {
	it("spans the rainbow from 0% to 100%", () => {
		expect(RAINBOW_STOPS[0].offset).toBe("0%");
		expect(RAINBOW_STOPS.at(-1)?.offset).toBe("100%");
	});

	it("pairs abrupt stops at identical offsets", () => {
		expect(ABRUPT_STOPS[0].offset).toBe(ABRUPT_STOPS[1].offset);
		expect(ABRUPT_STOPS[2].offset).toBe(ABRUPT_STOPS[3].offset);
	});

	it("shades radial stops from lighter to darker around the base color", () => {
		const [inner, base, outer] = radialStopsFor("#808080");
		expect(base.color).toBe("#808080");
		expect(inner.color > base.color).toBe(true);
		expect(outer.color < base.color).toBe(true);
	});
});
