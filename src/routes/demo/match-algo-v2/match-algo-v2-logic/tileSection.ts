import type { SongSection } from "../../../../data/songBrowser.js";
import type { CoreProgression } from "$data/core-progressions.js";
import type { MatchWeights } from "./weights.js";
import type { ScoredTile } from "./score.js";
import { computeScoredTile } from "./score.js";
import { generateCandidates } from "./candidates.js";

export type TileSpan = {
  sectionIndex: number;
  tile: ScoredTile;
  highlightPositions: number[];
  rejectedAtSameStart: ScoredTile[];
};

export const tileSection = (
  section: SongSection,
  sectionIndex: number,
  coreProgressions: CoreProgression[],
  coreNameByKey: Map<string, string>,
  weights: MatchWeights,
  startIndex = 0
): TileSpan[] => {
  if (startIndex >= section.parsedProgression.length) return [];

  const candidates = generateCandidates(
    section,
    startIndex,
    coreProgressions,
    coreNameByKey
  );
  if (candidates.length === 0) return [];

  const scored = candidates.map((c) =>
    computeScoredTile(c, section.parsedProgression.length, weights)
  );

  const best = scored.reduce((prev, curr) =>
    curr.totalScore > prev.totalScore ? curr : prev
  );

  const highlightPositions = Array.from(
		{ length: best.tile.coveredLength },
		(_, i) => best.tile.startIndex + i
	);

  const span: TileSpan = {
    sectionIndex,
    tile: best,
    highlightPositions,
    rejectedAtSameStart: scored.filter((s) => s !== best),
  };

  const nextStart =
    best.tile.startIndex +
    best.tile.coveredLength +
    best.tile.prefixLeftoverLength;

  return [
    span,
    ...tileSection(
      section,
      sectionIndex,
      coreProgressions,
      coreNameByKey,
      weights,
      nextStart
    ),
  ];
};
