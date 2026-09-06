import { describe, it, expect } from "vitest";
import type { ParsedProgressionChord } from "../../../../chord-processing/types.js";
import type { SongSection, GroupedSong } from "../../../../data/songBrowser.js";
import { groupSongs } from "../../../../data/songBrowser.js";
import songs from "../../../../../static/data/songs.json";
import coreProgressions from "$data/core-progressions.js";
import { buildColoredHighlightSegments } from "../../define-chord-progression/progression-matching-logic/progressionMatchAnalysis.js";
import {
  computeFeatureValues,
  contiguousRepeatFeature,
  sectionEndFeature,
  sectionStartFeature,
  lengthFeature,
  coreFeature,
} from "./features.js";
import { computeScoredTile } from "./score.js";
import { generateCandidates } from "./candidates.js";
import { tileSection } from "./tileSection.js";
import { matchSongV2 } from "./matchSongV2.js";
import { DEFAULT_WEIGHTS } from "./weights.js";
import type { MatchWeights } from "./weights.js";
import type { CoreProgression } from "$data/core-progressions.js";

// Helpers
const chord = (
  rootPitchClass: number,
  suffix: string
): ParsedProgressionChord => ({
  rootPitchClass,
  suffix,
  display: "",
});

// C major: I=C(0), ii=D(2), iii=E(4), IV=F(5), V=G(7), vi=A(9), vii=B(11)
const C = chord(0, "major");
const D_min = chord(2, "minor");
const E_min = chord(4, "minor");
const F = chord(5, "major");
const G = chord(7, "major");
const A_min = chord(9, "minor");

const makeSection = (
  parsedProgression: ParsedProgressionChord[],
  romanTokens?: string[],
  label: string | null = null
): SongSection => ({
  label,
  chords: [],
  romanTokens: romanTokens ?? parsedProgression.map(() => "?"),
  parsedProgression,
  keyLabel: null,
  scale: "major" as const,
});

const makeSong = (sections: SongSection[]): GroupedSong => ({
  songKey: "test-song",
  title: "Test",
  artists: [],
  keyLabel: null,
  sections,
});

// I-vi-IV-V repeating twice = [C Am F G C Am F G]
const iViIVV = [C, A_min, F, G];
const twoRepeats = [...iViIVV, ...iViIVV];

describe("feature functions", () => {
  it("coreFeature returns 1 for core, 0 otherwise", () => {
    expect(coreFeature(true)).toBe(1.0);
    expect(coreFeature(false)).toBe(0.0);
  });

  it("lengthFeature peaks at 4", () => {
    expect(lengthFeature(4)).toBe(1.0);
    expect(lengthFeature(3)).toBe(0.95);
    expect(lengthFeature(5)).toBe(0.35);
    expect(lengthFeature(6)).toBe(0.2);
    expect(lengthFeature(2)).toBe(0.0);
  });

  it("sectionStartFeature rewards position 0", () => {
    expect(sectionStartFeature(0)).toBe(1.0);
    expect(sectionStartFeature(1)).toBe(0.4);
    expect(sectionStartFeature(4)).toBe(0.1);
  });

  it("sectionEndFeature: exact run end = 1.0, prefix-absorbed end = 0.6, open = 0.15", () => {
    // Exact: 2 repeats of 4 chords fills 8 chord section
    expect(sectionEndFeature(0, 8, 0, 8)).toBe(1.0);
    // Prefix absorbed: run ends at 8, prefix brings it to 8 — but run already = 8
    expect(sectionEndFeature(0, 6, 2, 8)).toBe(0.6);
    // Open: more chords remain
    expect(sectionEndFeature(0, 4, 0, 8)).toBe(0.15);
  });

  it("contiguousRepeatFeature saturates at 3", () => {
    expect(contiguousRepeatFeature(0)).toBe(0.0);
    expect(contiguousRepeatFeature(1)).toBe(0.25);
    expect(contiguousRepeatFeature(2)).toBe(0.75);
    expect(contiguousRepeatFeature(3)).toBe(1.0);
    expect(contiguousRepeatFeature(10)).toBe(1.0);
  });
});

describe("generateCandidates", () => {
  it("finds a 4-chord candidate at start of a section with 2 repeats", () => {
    const tokens = ["I", "vi", "IV", "V", "I", "vi", "IV", "V"];
    const section = makeSection(twoRepeats, tokens);
    const candidates = generateCandidates(section, 0, [], []);

    const fourChord = candidates.find(
      (c) => c.unit.length === 4 && c.startIndex === 0
    );
    expect(fourChord).toBeDefined();
    expect(fourChord!.repeatCount).toBe(2);
    expect(fourChord!.coveredLength).toBe(8);
  });

  it("excludes self-repeating patterns from path A", () => {
    // I-V-I-V is self-repeating
    const section = makeSection(
      [C, G, C, G, C, G, C, G],
      ["I", "V", "I", "V", "I", "V", "I", "V"]
    );
    const candidates = generateCandidates(section, 0, [], []);
    // The 4-chord I-V-I-V should be absent from path A
    const selfRepeat = candidates.find(
      (c) => c.unitRomanString === "I-V-I-V" && !c.isCore
    );
    expect(selfRepeat).toBeUndefined();
  });

  it("detects prefix leftover when section ends mid-loop", () => {
    // 2 full repeats (8 chords) + 2 chord prefix: I-vi | total 10 chords
    const tokens = ["I", "vi", "IV", "V", "I", "vi", "IV", "V", "I", "vi"];
    const section = makeSection([...twoRepeats, C, A_min], tokens);
    const candidates = generateCandidates(section, 0, [], []);

    const fourChord = candidates.find(
      (c) => c.unit.length === 4 && c.startIndex === 0
    );
    expect(fourChord).toBeDefined();
    expect(fourChord!.repeatCount).toBe(2);
    expect(fourChord!.prefixLeftoverLength).toBe(2);
  });
});

describe("computeScoredTile", () => {
  it("length=4 scores higher than length=3 when both repeat twice and fill section", () => {
    const tokens4 = ["I", "vi", "IV", "V", "I", "vi", "IV", "V"];
    const tokens3 = ["I", "vi", "IV", "I", "vi", "IV"];
    const section4 = makeSection(twoRepeats, tokens4);
    const section3 = makeSection(
      [C, A_min, F, C, A_min, F],
      tokens3
    );

    const candidates4 = generateCandidates(section4, 0, [], []);
    const tile4 = candidates4.find((c) => c.unit.length === 4)!;
    const scored4 = computeScoredTile(tile4, 8, DEFAULT_WEIGHTS);

    const candidates3 = generateCandidates(section3, 0, [], []);
    const tile3 = candidates3.find((c) => c.unit.length === 3)!;
    const scored3 = computeScoredTile(tile3, 6, DEFAULT_WEIGHTS);

    // length 4 should score higher on length dimension
    expect(scored4.featureValues.length).toBeGreaterThan(
      scored3.featureValues.length
    );
  });

  it("increasing contiguousRepeat weight increases contiguousRepeat contribution", () => {
    const section = makeSection(twoRepeats, ["I", "vi", "IV", "V", "I", "vi", "IV", "V"]);
    const candidates = generateCandidates(section, 0, [], []);
    const tile = candidates.find((c) => c.unit.length === 4)!;

    const lowRepeatWeights: MatchWeights = { ...DEFAULT_WEIGHTS, contiguousRepeat: 0.1 };
    const highRepeatWeights: MatchWeights = { ...DEFAULT_WEIGHTS, contiguousRepeat: 2.0 };

    const scoredLow = computeScoredTile(tile, 8, lowRepeatWeights);
    const scoredHigh = computeScoredTile(tile, 8, highRepeatWeights);

    expect(scoredHigh.weightedContributions.contiguousRepeat).toBeGreaterThan(
      scoredLow.weightedContributions.contiguousRepeat
    );
  });
});

describe("tileSection", () => {
  it("tiles a section with 2 identical repeats as one span", () => {
    const tokens = ["I", "vi", "IV", "V", "I", "vi", "IV", "V"];
    const section = makeSection(twoRepeats, tokens);
    const spans = tileSection(section, 0, [], [], DEFAULT_WEIGHTS);

    expect(spans).toHaveLength(1);
    expect(spans[0].tile.tile.unit.length).toBe(4);
    expect(spans[0].highlightPositions).toHaveLength(8);
  });

  it("recursively tiles a section with two distinct parts", () => {
    // I-vi-IV-V × 2 followed by I-ii-V-I × 2
    const part1 = [C, A_min, F, G, C, A_min, F, G];
    const part2 = [C, D_min, G, C, C, D_min, G, C];
    const tokens = [
      "I", "vi", "IV", "V", "I", "vi", "IV", "V",
      "I", "ii", "V", "I", "I", "ii", "V", "I",
    ];
    const section = makeSection([...part1, ...part2], tokens);
    const spans = tileSection(section, 0, [], [], DEFAULT_WEIGHTS);

    expect(spans.length).toBeGreaterThanOrEqual(2);
    // First span should start at 0
    expect(spans[0].tile.tile.startIndex).toBe(0);
  });

  it("start-anchoring prefers I-vi-ii-V over vi-ii-V-I rotation", () => {
    // Section starts on I: I-vi-ii-V repeated twice = 8 chords
    // The vi-ii-V-I rotation starts at position 1
    const tokens = ["I", "vi", "ii", "V", "I", "vi", "ii", "V"];
    const section = makeSection(
      [C, A_min, D_min, G, C, A_min, D_min, G],
      tokens
    );
    const spans = tileSection(section, 0, [], [], DEFAULT_WEIGHTS);

    // The winning tile should start at index 0
    expect(spans[0].tile.tile.startIndex).toBe(0);
    // And should be the I-vi-ii-V rotation, not vi-ii-V-I
    expect(spans[0].tile.tile.unitRomanString.startsWith("I")).toBe(true);
  });
});

describe("matchSongV2", () => {
  it("returns an explainedPercent proportional to covered chords", () => {
    const section = makeSection(
      twoRepeats,
      ["I", "vi", "IV", "V", "I", "vi", "IV", "V"]
    );
    const result = matchSongV2(makeSong([section]), [], DEFAULT_WEIGHTS);
    expect(result.explainedPercent).toBe(100);
  });

  it("unifies tiles from different sections that share the same pattern", () => {
    const tokens = ["I", "vi", "IV", "V", "I", "vi", "IV", "V"];
    const section = makeSection(twoRepeats, tokens, "verse");
    const section2 = makeSection(twoRepeats, tokens, "chorus");
    const result = matchSongV2(
      makeSong([section, section2]),
      [],
      DEFAULT_WEIGHTS
    );

    // Both sections have the same pattern → should unify into one progression
    expect(result.unifiedProgressions).toHaveLength(1);
    expect(result.unifiedProgressions[0].spans).toHaveLength(2);
  });

  it("does not count a leftover prefix chord toward explainedPercent", () => {
		const tokens = ["I", "ii", "V", "I", "ii", "V", "I"];
		const leftoverIndex = tokens.length - 1;
		const fullCoveragePercent = 100;
		const section = makeSection([C, D_min, G, C, D_min, G, C], tokens);
		const result = matchSongV2(makeSong([section]), [], DEFAULT_WEIGHTS);

		expect(result.explainedPercent).toBeLessThan(fullCoveragePercent);
		expect(
			result.annotations[0]?.highlightPositionsBySection?.[0]
		).not.toContain(leftoverIndex);
	});

  it("produces annotations compatible with SongChordsDisplay", () => {
    const section = makeSection(
      twoRepeats,
      ["I", "vi", "IV", "V", "I", "vi", "IV", "V"]
    );
    const result = matchSongV2(makeSong([section]), [], DEFAULT_WEIGHTS);

    expect(result.annotations).toHaveLength(1);
    expect(result.annotations[0].highlightPositionsBySection).toBeDefined();
    expect(result.annotations[0].highlightPositionsBySection![0]).toHaveLength(8);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].coveragePercent).toBe(100);
  });
});

const CHANDELIER_SONG_KEY = "sia__chandelier";
const BRIDGE_LABEL = "Bridge";
const VI_VII_III = "VI-VII-III";
const VI_VII_III_UNIT_LENGTH = 3;
const SHORT_BRIDGE_CHORD_COUNT = 7;
const LONG_BRIDGE_CHORD_COUNT = 13;
const SHORT_BRIDGE_INSTANCE_COUNT = 2;
const LONG_BRIDGE_INSTANCE_COUNT = 4;

const chandelierSong = groupSongs(
	(songs as { songKey: string }[]).filter(
		(s) => s.songKey === CHANDELIER_SONG_KEY
	) as Parameters<typeof groupSongs>[0]
)[0];

const paintedPositionsForSection = (
	section: SongSection,
	sectionIndex: number,
	annotations: ReturnType<typeof matchSongV2>["annotations"]
): number[] =>
	buildColoredHighlightSegments(section, sectionIndex, annotations)
		.filter((segment) => segment.palette !== null)
		.flatMap((segment) => segment.indices)
		.sort((a, b) => a - b);

const claimedPositionsForSection = (
	annotations: ReturnType<typeof matchSongV2>["annotations"],
	sectionIndex: number
): number[] =>
	[
		...new Set(
			annotations.flatMap(
				(annotation) =>
					annotation.highlightPositionsBySection?.[sectionIndex] ?? []
			)
		)
	].sort((a, b) => a - b);

const viViiIiiSegments = (
	section: SongSection,
	sectionIndex: number,
	annotations: ReturnType<typeof matchSongV2>["annotations"]
) =>
	buildColoredHighlightSegments(section, sectionIndex, annotations).filter(
		(segment) =>
			segment.palette !== null && segment.chordProgression === VI_VII_III
	);

describe("chandelier highlight visualization", () => {
	it("paints every claimed chord, including both VI-VII-III bridges", () => {
		const result = matchSongV2(
			chandelierSong,
			coreProgressions,
			DEFAULT_WEIGHTS
		);

		for (const [sectionIndex, section] of chandelierSong.sections.entries()) {
			expect(
				paintedPositionsForSection(section, sectionIndex, result.annotations)
			).toEqual(claimedPositionsForSection(result.annotations, sectionIndex));
		}

		const bridges = chandelierSong.sections.flatMap((section, sectionIndex) =>
			section.label === BRIDGE_LABEL ? [{ section, sectionIndex }] : []
		);
		expect(bridges).toHaveLength(2);

		const shortBridge = bridges.find(
			({ section }) =>
				section.parsedProgression.length === SHORT_BRIDGE_CHORD_COUNT
		);
		const longBridge = bridges.find(
			({ section }) =>
				section.parsedProgression.length === LONG_BRIDGE_CHORD_COUNT
		);
		expect(shortBridge).toBeDefined();
		expect(longBridge).toBeDefined();

		const shortSegments = viViiIiiSegments(
			shortBridge!.section,
			shortBridge!.sectionIndex,
			result.annotations
		);
		const longSegments = viViiIiiSegments(
			longBridge!.section,
			longBridge!.sectionIndex,
			result.annotations
		);

		expect(shortSegments).toHaveLength(SHORT_BRIDGE_INSTANCE_COUNT);
		expect(longSegments).toHaveLength(LONG_BRIDGE_INSTANCE_COUNT);
		expect(shortSegments.flatMap((segment) => segment.indices)).toHaveLength(
			SHORT_BRIDGE_INSTANCE_COUNT * VI_VII_III_UNIT_LENGTH
		);
		expect(longSegments.flatMap((segment) => segment.indices)).toHaveLength(
			LONG_BRIDGE_INSTANCE_COUNT * VI_VII_III_UNIT_LENGTH
		);
	});
});

const VIVA_LA_VIDA_NAME = "viva la vida";
const VIVA_LA_VIDA_SONG_KEY = "coldplay__viva-la-vida";
const STAY_WITH_ME_NAME = "stay with me";

const vivaLaVidaCore: CoreProgression = {
	name: VIVA_LA_VIDA_NAME,
	chordProgression: "IV-V-I-vi",
	scale: "major",
	description: ""
};

const stayWithMeCore: CoreProgression = {
	name: STAY_WITH_ME_NAME,
	chordProgression: "i-VI-III",
	scale: "minor",
	matchRomanNumeralsExactly: true,
	description: ""
};

const vivaSong = groupSongs(
	(songs as { songKey: string }[]).filter(
		(s) => s.songKey === VIVA_LA_VIDA_SONG_KEY
	) as Parameters<typeof groupSongs>[0]
)[0];

describe("v2 relative vs exact roman matching", () => {
	it("matches IV-V-I-vi in major as a relative of VI-VII-III-i in minor", () => {
		const vi = chord(8, "major");
		const vii = chord(10, "maj7");
		const iii = chord(3, "major");
		const i = chord(0, "minor");
		const section: SongSection = {
			...makeSection(
				[vi, vii, iii, i, vi, vii, iii, i],
				["VI", "VII", "III", "i", "VI", "VII", "III", "i"]
			),
			scale: "minor"
		};
		const result = matchSongV2(makeSong([section]), [vivaLaVidaCore]);
		const viva = result.matches.find(
			(match) => match.name === VIVA_LA_VIDA_NAME
		);
		expect(viva?.isCoreProgression).toBe(true);
		expect(viva?.matchRomanNumeralsExactly).toBe(false);
	});

	it("does not treat vi-IV-I in major as stay with me when exact roman matching is required", () => {
		const section = makeSection(
			[A_min, F, C, A_min, F, C],
			["vi", "IV", "I", "vi", "IV", "I"]
		);
		const result = matchSongV2(makeSong([section]), [stayWithMeCore]);
		expect(
			result.matches.some((match) => match.name === STAY_WITH_ME_NAME)
		).toBe(false);
	});

	it("does treat i-VI-III in minor as stay with me when exact roman matching is required", () => {
		const i = chord(0, "minor");
		const VI = chord(8, "major");
		const III = chord(3, "major");
		const section: SongSection = {
			...makeSection(
				[i, VI, III, i, VI, III],
				["i", "VI", "III", "i", "VI", "III"]
			),
			scale: "minor"
		};
		const result = matchSongV2(makeSong([section]), [stayWithMeCore]);
		expect(
			result.matches.some(
				(match) =>
					match.name === STAY_WITH_ME_NAME &&
					match.isCoreProgression &&
					match.matchRomanNumeralsExactly === true
			)
		).toBe(true);
	});

	it("labels Coldplay Viva La Vida as the viva la vida core", () => {
		const result = matchSongV2(vivaSong, coreProgressions);
		expect(
			result.matches.some(
				(match) => match.name === VIVA_LA_VIDA_NAME && match.isCoreProgression
			)
		).toBe(true);
	});
});
