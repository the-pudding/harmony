import type { GroupedSong } from "../../../../data/songBrowser.js";
import type { CoreProgression } from "$data/core-progressions.js";
import { buildCoreNameByAbstractKey } from "../../define-chord-progression/progression-matching-logic/progressionMatchAnalysis.js";
import type {
  ChordAnnotation,
  ProgressionWithMatchStats,
} from "../../define-chord-progression/progression-matching-logic/progressionMatchAnalysis.js";
import { abstractProgressionKey, scopedToScale } from "../../define-chord-progression/progression-matching-logic/progressionMatchAnalysis.js";
import {
  highlightPaletteFromColor,
  UNGROUPED_PROGRESSION_PALETTE,
} from "../../define-chord-progression/components/progressionColors.js";
import {
  colorForProgressionGroupName,
  UNGROUPED_PROGRESSION_GROUP_COLOR,
} from "$data/core-progressions.js";
import { progressionGroupNameFor } from "$data/core-progressions.util.js";
import type { MatchWeights } from "./weights.js";
import { DEFAULT_WEIGHTS } from "./weights.js";
import { tileSection, type TileSpan } from "./tileSection.js";
import type { ChordHighlightPalette } from "../../define-chord-progression/progression-matching-logic/progressionMatchAnalysis.js";
import type { ScaleName } from "../../../../chord-processing/scales.js";

// Non-core progressions found by v2 get colors cycling through this palette.
const GAP_FILL_COLORS = [
  "#e15759",
  "#b07aa1",
  "#ff9da7",
  "#9c755f",
  "#bab0ac",
  "#f1ce63",
];

export type UnifiedProgression = {
  harmonicKey: string;
  romanString: string;
  scale: ScaleName;
  coreName?: string;
  highlightPalette: ChordHighlightPalette;
  spans: TileSpan[];
};

export type SectionMatchResult = {
  sectionIndex: number;
  spans: TileSpan[];
  uncoveredPositions: number[];
};

export type MatchAlgoV2Result = {
  song: GroupedSong;
  weights: MatchWeights;
  sectionResults: SectionMatchResult[];
  unifiedProgressions: UnifiedProgression[];
  matches: ProgressionWithMatchStats[];
  explainedPercent: number;
  annotations: ChordAnnotation[];
};

const PERCENT_MULTIPLIER = 100;

const songChordCount = (song: GroupedSong): number =>
  song.sections.reduce(
    (sum, section) => sum + section.parsedProgression.length,
    0
  );

const claimedChordCount = (unified: UnifiedProgression): number =>
  unified.spans.reduce(
    (sum, span) => sum + span.highlightPositions.length,
    0
  );

const instanceCount = (unified: UnifiedProgression): number =>
  unified.spans.reduce((sum, span) => {
    const prefixInstance = span.tile.tile.prefixLeftoverLength > 0 ? 1 : 0;
    return sum + span.tile.tile.repeatCount + prefixInstance;
  }, 0);

const toMatchStats = (
  unified: UnifiedProgression,
  totalChords: number
): ProgressionWithMatchStats => ({
  name: unified.coreName ?? unified.romanString,
  chordProgression: unified.romanString,
  parsedProgression: unified.spans[0].tile.tile.unit,
  scale: unified.scale,
  description: "",
  matchCount: instanceCount(unified),
  coveragePercent:
    totalChords > 0
      ? (claimedChordCount(unified) / totalChords) * PERCENT_MULTIPLIER
      : 0,
  isCoreProgression: unified.coreName !== undefined,
  highlightPalette: unified.highlightPalette,
});

const buildHighlightPositionsBySection = (
  spans: TileSpan[],
  sectionCount: number
): number[][] =>
  Array.from({ length: sectionCount }, (_, sectionIndex) =>
    spans
      .filter((span) => span.sectionIndex === sectionIndex)
      .flatMap((span) => span.highlightPositions)
  );

const paletteForUnified = (
  unified: UnifiedProgression,
  gapFillIndex: number
): ChordHighlightPalette => {
  if (unified.coreName) {
    const groupName = progressionGroupNameFor("", unified.coreName);
    const color = colorForProgressionGroupName(groupName);
    return highlightPaletteFromColor(color);
  }
  const color =
    GAP_FILL_COLORS[gapFillIndex % GAP_FILL_COLORS.length] ??
    UNGROUPED_PROGRESSION_GROUP_COLOR;
  return highlightPaletteFromColor(color);
};

export const matchSongV2 = (
  song: GroupedSong,
  coreProgressions: CoreProgression[],
  weights: MatchWeights = DEFAULT_WEIGHTS
): MatchAlgoV2Result => {
  const coreNameByKey = buildCoreNameByAbstractKey(coreProgressions);

  // Tile each section independently
  const allSpans: TileSpan[] = song.sections.flatMap((section, sectionIndex) =>
    tileSection(section, sectionIndex, coreProgressions, coreNameByKey, weights)
  );

  // Build per-section coverage info
  const sectionResults: SectionMatchResult[] = song.sections.map(
    (section, sectionIndex) => {
      const sectionSpans = allSpans.filter(
        (span) => span.sectionIndex === sectionIndex
      );
      const coveredSet = new Set(
        sectionSpans.flatMap((span) => span.highlightPositions)
      );
      const uncoveredPositions = Array.from(
        { length: section.parsedProgression.length },
        (_, i) => i
      ).filter((i) => !coveredSet.has(i));
      return { sectionIndex, spans: sectionSpans, uncoveredPositions };
    }
  );

  // Unify spans that share the same harmonic pattern (abstract key + scale)
  const byKey = new Map<string, TileSpan[]>();
  for (const span of allSpans) {
    const key = scopedToScale(
      abstractProgressionKey(span.tile.tile.unit),
      song.sections[span.sectionIndex].scale
    );
    const existing = byKey.get(key);
    byKey.set(key, existing ? [...existing, span] : [span]);
  }

  let gapFillColorIndex = 0;
  const unifiedProgressions: UnifiedProgression[] = [];

  for (const [harmonicKey, spans] of byKey) {
    const firstSpan = spans[0];
    const section = song.sections[firstSpan.sectionIndex];
    const unified: UnifiedProgression = {
      harmonicKey,
      romanString: firstSpan.tile.tile.unitRomanString,
      scale: section.scale,
      coreName: firstSpan.tile.tile.coreName,
      highlightPalette: UNGROUPED_PROGRESSION_PALETTE, // placeholder
      spans,
    };
    unified.highlightPalette = paletteForUnified(
      unified,
      unified.coreName ? 0 : gapFillColorIndex++
    );
    unifiedProgressions.push(unified);
  }

  const mergedUnifiedProgressions = unifiedProgressions.reduce<
		UnifiedProgression[]
	>((merged, unified) => {
		const displayKey = scopedToScale(unified.romanString, unified.scale);
		const existingIndex = merged.findIndex(
			(entry) => scopedToScale(entry.romanString, entry.scale) === displayKey
		);
		if (existingIndex === -1) return [...merged, unified];
		return merged.map((entry, index) =>
			index === existingIndex
				? { ...entry, spans: [...entry.spans, ...unified.spans] }
				: entry
		);
	}, []);

	const annotations: ChordAnnotation[] = mergedUnifiedProgressions.map(
		(unified) => ({
			parsedProgression: unified.spans[0].tile.tile.unit,
			palette: unified.highlightPalette,
			chordProgression: unified.romanString,
			highlightPositionsBySection: buildHighlightPositionsBySection(
				unified.spans,
				song.sections.length
			),
			matchRomanNumeralsExactly: false
		})
	);

  // Compute explained percent
  const totalChords = songChordCount(song);
  const coveredChords = sectionResults.reduce(
    (sum, result) =>
      sum +
      result.spans.flatMap((span) => span.highlightPositions).length,
    0
  );
  const explainedPercent =
    totalChords > 0
      ? Math.round((coveredChords / totalChords) * PERCENT_MULTIPLIER)
      : 0;

  return {
		song,
		weights,
		sectionResults,
		unifiedProgressions: mergedUnifiedProgressions,
		matches: mergedUnifiedProgressions.map((unified) =>
			toMatchStats(unified, totalChords)
		),
		explainedPercent,
		annotations
	};
};
