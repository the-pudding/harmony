import { describe, expect, it } from "vitest";
import songs from "../../../../../static/data/songs.json";
import coreProgressions from "$data/core-progressions.js";
import { groupSongs } from "../../../../data/songBrowser.js";
import {
	buildFinalChordAnnotations,
	selectFinalProgressions
} from "./finalProgressionSelection.js";
import { buildColoredHighlightSegments } from "./progressionMatchAnalysis.js";

const millionReasonsSong = groupSongs(
	(songs as { songKey: string }[]).filter(
		(s) => s.songKey === "lady-gaga__million-reasons"
	) as Parameters<typeof groupSongs>[0]
)[0];

const CHORUS_LABEL = "Chorus";
const WHATCHA_SAY = "IV-I-vi-V";
const EMO_WALK_DOWN = "I-vi-V-IV";

describe("million reasons — section-start bias selects IV-I-vi-V over I-vi-V-IV", () => {
	it("coreSelected contains IV-I-vi-V (whatcha say)", () => {
		const result = selectFinalProgressions(
			millionReasonsSong,
			coreProgressions
		);
		const selectedKeys = result.coreSelected.map((m) => m.chordProgression);
		expect(selectedKeys).toContain(WHATCHA_SAY);
	});

	it("coreSelected does not contain I-vi-V-IV (emo walk down)", () => {
		const result = selectFinalProgressions(
			millionReasonsSong,
			coreProgressions
		);
		const selectedKeys = result.coreSelected.map((m) => m.chordProgression);
		expect(selectedKeys).not.toContain(EMO_WALK_DOWN);
	});

	it("chorus position 0 (opening IV) is highlighted", () => {
		const result = selectFinalProgressions(
			millionReasonsSong,
			coreProgressions
		);
		const annotations = buildFinalChordAnnotations(millionReasonsSong, result);

		const chorusIndex = millionReasonsSong.sections.findIndex(
			(s) => s.label === CHORUS_LABEL
		);
		expect(chorusIndex).toBeGreaterThanOrEqual(0);

		const chorusSection = millionReasonsSong.sections[chorusIndex];
		const segments = buildColoredHighlightSegments(
			chorusSection,
			chorusIndex,
			annotations
		);

		const openingSegment = segments.find((seg) => seg.indices.includes(0));
		expect(openingSegment?.palette).not.toBeNull();
		expect(openingSegment?.palette).toBeDefined();
	});

	it("chorus position 0 is highlighted with IV-I-vi-V progression", () => {
		const result = selectFinalProgressions(
			millionReasonsSong,
			coreProgressions
		);
		const annotations = buildFinalChordAnnotations(millionReasonsSong, result);

		const chorusIndex = millionReasonsSong.sections.findIndex(
			(s) => s.label === CHORUS_LABEL
		);
		const chorusSection = millionReasonsSong.sections[chorusIndex];
		const segments = buildColoredHighlightSegments(
			chorusSection,
			chorusIndex,
			annotations
		);

		const openingSegment = segments.find((seg) => seg.indices.includes(0));
		expect(openingSegment?.chordProgression).toBe(WHATCHA_SAY);
	});
});
