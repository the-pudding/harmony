import { describe, expect, it } from "vitest";
import coreProgressions, {
	progressionsThatDidntMatchAnything
} from "./core-progressions.js";
import { romanTokensToParsedProgression } from "../chord-processing/romanNumerals.js";

const allProgressions = [
	...coreProgressions,
	...progressionsThatDidntMatchAnything
];

describe("core progressions — schema validation", () => {
	it("every entry parses successfully with its declared scale", () => {
		const failed = allProgressions.filter((p) => {
			const parsed = romanTokensToParsedProgression(
				p.chordProgression.split("-"),
				p.scale
			);
			return parsed === null;
		});
		expect(failed).toHaveLength(0);
	});
});
