import { describe, expect, it } from "vitest";
import songs from "../../../../../static/data/songs.json";
import coreProgressions from "$data/core-progressions.js";
import { groupSongs } from "../../../../data/songBrowser.js";
import { correctedSongContentsToSongInputs } from "../../../../data/applyHandReviewedCorrections.js";
import { handCorrectedSongs } from "../../../../data/hand-corrected-songs.js";
import type { ChordAnnotation } from "./progressionMatchAnalysis.js";
import {
	buildFinalChordAnnotations,
	selectFinalProgressions
} from "./finalProgressionSelection.js";
import type { SectionCoverage } from "./greedyProgressionSelection.js";
import { computeGapFillProgressionMatches } from "./gapFillProgressionAnalysis.js";
import { emptyCoverage } from "./greedyProgressionSelection.js";
import type { GroupedSong, SongSection } from "../../../../data/songBrowser.js";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";

const assertNoOverlappingCoverage = (coverage: SectionCoverage): void => {
	for (const sectionPositions of coverage) {
		expect(new Set(sectionPositions).size).toBe(sectionPositions.length);
	}
};

const assertAnnotationsDisjoint = (
	annotations: ChordAnnotation[],
	sectionCount: number
): void => {
	for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex++) {
		const claimed = new Set<number>();
		for (const annotation of annotations) {
			const positions =
				annotation.highlightPositionsBySection?.[sectionIndex] ?? [];
			for (const position of positions) {
				expect(claimed.has(position)).toBe(false);
				claimed.add(position);
			}
		}
	}
};

const whatchaSaySong = groupSongs(
	(songs as { songKey: string }[]).filter(
		(s) => s.songKey === "jason-derulo__whatcha-say"
	) as Parameters<typeof groupSongs>[0]
)[0];

const makeRomanSection = (romanTokens: string[]): SongSection => ({
	label: null,
	chords: romanTokens,
	romanTokens,
	parsedProgression: romanTokensToParsedProgression(romanTokens, "major") ?? [],
	keyLabel: null,
	scale: "major"
});

const imYours: GroupedSong = {
	songKey: "test__im-yours",
	title: "I'm Yours",
	artists: ["Jason Mraz"],
	keyLabel: null,
	sections: [
		makeRomanSection(["I", "V", "vi", "V", "IV", "I", "V", "vi", "V", "IV"]),
		makeRomanSection(["I", "V", "vi", "IV", "I", "V", "vi", "IV"]),
		makeRomanSection(["I", "V", "vi", "IV"])
	]
};

const vampVerse = makeRomanSection([
	"iv",
	"v",
	"iv",
	"v",
	"iv",
	"v",
	"iv",
	"v",
	"iv",
	"v",
	"iv",
	"v",
	"iv",
	"v",
	"iv",
	"v"
]);
const vampBridge = makeRomanSection([
	"iv",
	"v",
	"iv",
	"v",
	"iv",
	"v",
	"iv",
	"v",
	"iv",
	"v",
	"iv",
	"v"
]);
const vampPreChorus = makeRomanSection([
	"iv",
	"v",
	"VI",
	"i",
	"iv",
	"v",
	"VI",
	"i"
]);

const vampSong: GroupedSong = {
	songKey: "drake__gods-plan",
	title: "God's Plan",
	artists: ["Drake"],
	keyLabel: null,
	sections: [vampVerse, vampBridge, vampPreChorus]
};

const highestInTheRoomReview = handCorrectedSongs.find(
	(s) => s.id === "travis-scott__highest-in-the-room"
)!;
const highestInTheRoomSong = groupSongs(
	correctedSongContentsToSongInputs(
		highestInTheRoomReview.id,
		"Highest in the Room",
		["Travis Scott"],
		2019,
		highestInTheRoomReview.correctedSongContents
	)
)[0];

const assertFinalSelectionInvariants = (
	song: GroupedSong,
	songLabel: string
): void => {
	const result = selectFinalProgressions(song, coreProgressions);
	const annotations = buildFinalChordAnnotations(song, result);

	assertNoOverlappingCoverage(result.coverage);
	assertAnnotationsDisjoint(annotations, song.sections.length);

	const annotationPositions = song.sections.map((_, sectionIndex) =>
		annotations.flatMap(
			(annotation) =>
				annotation.highlightPositionsBySection?.[sectionIndex] ?? []
		)
	);
	expect(annotationPositions).toEqual(result.coverage);

	const gapKeys = result.gapSelected.map((match) => match.chordProgression);
	expect(new Set(gapKeys).size).toBe(gapKeys.length);

	if (songLabel === "whatcha say") {
		expect(gapKeys).not.toContain("vi-V-IV");
	}
};

describe("selectFinalProgressions — no-overlap invariants", () => {
	it("whatcha say has disjoint coverage and excludes vi-V-IV", () => {
		assertFinalSelectionInvariants(whatchaSaySong, "whatcha say");
	});

	it("i'm yours has disjoint coverage", () => {
		assertFinalSelectionInvariants(imYours, "i'm yours");
	});

	it("god's plan still reaches full coverage without overlaps", () => {
		const result = selectFinalProgressions(vampSong, coreProgressions);
		assertNoOverlappingCoverage(result.coverage);
		expect(result.explainedPercent).toBe(100);
		expect(result.gapSelected.map((match) => match.chordProgression)).toContain(
			"iv-v-iv-v"
		);
	});

	it("highest in the room still selects i-v-VI-iv without overlaps", () => {
		const result = selectFinalProgressions(
			highestInTheRoomSong,
			coreProgressions
		);
		assertNoOverlappingCoverage(result.coverage);
		expect(result.gapSelected.map((match) => match.chordProgression)).toContain(
			"i-v-VI-iv"
		);
	});

	it("burnin up keeps positive explained coverage without overlaps", () => {
		const burninSong = groupSongs(
			(songs as { songKey: string }[]).filter(
				(s) => s.songKey === "jonas-brothers__burnin-up"
			) as Parameters<typeof groupSongs>[0]
		)[0];
		const result = selectFinalProgressions(burninSong, coreProgressions);
		assertNoOverlappingCoverage(result.coverage);
		expect(result.explainedPercent).toBeGreaterThan(52);
	});

	it("gap candidates on empty coverage match full-song recurrence stats", () => {
		const fullSongMatches = computeGapFillProgressionMatches(
			imYours,
			emptyCoverage(imYours)
		);
		const vViIv = fullSongMatches.find(
			(match) => match.chordProgression === "V-vi-IV"
		);
		expect(vViIv?.matchCount).toBeGreaterThanOrEqual(2);
	});
});
