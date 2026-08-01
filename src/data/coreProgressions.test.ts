import { describe, expect, it } from "vitest";
import coreProgressions, {
	progressionsThatDidntMatchAnything,
	chordProgressionVariants,
	siblingVariantsForProgression
} from "./core-progressions.js";
import { romanTokensToParsedProgression } from "../chord-processing/romanNumerals.js";

const allProgressions = [
	...coreProgressions,
	...progressionsThatDidntMatchAnything
];

describe("core progressions — schema validation", () => {
	it("every entry parses successfully with its declared scale", () => {
		const failed = allProgressions.filter((p) => {
			return chordProgressionVariants(p.chordProgression).some((variant) => {
				const parsed = romanTokensToParsedProgression(
					variant.split("-"),
					p.scale
				);
				return parsed === null;
			});
		});
		expect(failed).toHaveLength(0);
	});

	it("multi-variant entries expand to one parsed row per variant", () => {
		const multiVariant = allProgressions.find((p) =>
			Array.isArray(p.chordProgression)
		);
		if (!multiVariant) return;
		const variants = chordProgressionVariants(multiVariant.chordProgression);
		expect(variants.length).toBeGreaterThan(1);
		for (const variant of variants) {
			const parsed = romanTokensToParsedProgression(
				variant.split("-"),
				multiVariant.scale
			);
			expect(parsed).not.toBeNull();
		}
	});

	it("siblingVariantsForProgression returns every variant for a named progression", () => {
		expect(siblingVariantsForProgression(coreProgressions, "ii-V-I")).toEqual([
			"ii7-V7-Imaj7",
			"ii-V-I"
		]);
	});
});
