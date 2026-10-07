import { describe, expect, it } from "vitest";
import coreProgressions from "$data/core-progressions.js";
import { applyHandReviewedCorrections } from "$data/applyHandReviewedCorrections.js";
import type { SongInput } from "../../../chord-processing/types.js";
import { buildMatchedSongSections } from "./matchedSongSections.js";
import rubberBallSongInputs from "./data/bobby-vee__rubber-ball.song-inputs.json";

const songInputs = rubberBallSongInputs as SongInput[];
const correctedInputs = applyHandReviewedCorrections(songInputs);
const sections = buildMatchedSongSections(songInputs, coreProgressions);

describe("buildMatchedSongSections", () => {
	it("keeps hand-reviewed sections in song order, including repeated labels", () => {
		expect(sections.map((section) => section.name)).toEqual([
			"Chorus",
			"Verse 1",
			"Bridge",
			"Chorus",
			"Verse 2",
			"Chorus"
		]);
	});

	it("keeps every chord of every section", () => {
		expect(sections.map((section) => section.chords.length)).toEqual(
			correctedInputs.map((input) => input.progression.length)
		);
	});

	it("gives every section a unique id", () => {
		const ids = sections.map((section) => section.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("finds matched groups that stay within their section", () => {
		const groups = sections.flatMap((section) =>
			section.groups.map((group) => ({ group, section }))
		);
		expect(groups.length).toBeGreaterThan(0);
		groups.forEach(({ group, section }) => {
			expect(group.startIndex).toBeGreaterThanOrEqual(0);
			expect(group.startIndex + group.length).toBeLessThanOrEqual(
				section.chords.length
			);
		});
	});
});
