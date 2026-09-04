import type { MatchWeights } from "./weights.js";
import type { FeatureValues } from "./features.js";
import { computeFeatureValues } from "./features.js";
import type { CandidateTile } from "./candidates.js";

export type WeightedContributions = {
  core: number;
  length: number;
  sectionStart: number;
  sectionEnd: number;
  contiguousRepeat: number;
};

export type ScoredTile = {
  tile: CandidateTile;
  totalScore: number;
  featureValues: FeatureValues;
  weightedContributions: WeightedContributions;
};

export const computeScoredTile = (
  tile: CandidateTile,
  sectionLength: number,
  weights: MatchWeights
): ScoredTile => {
  const featureValues = computeFeatureValues(
    tile.isCore,
    tile.unit.length,
    tile.startIndex,
    tile.coveredLength,
    tile.prefixLeftoverLength,
    tile.repeatCount,
    sectionLength
  );

  const weightedContributions: WeightedContributions = {
    core: weights.core * featureValues.core,
    length: weights.length * featureValues.length,
    sectionStart: weights.sectionStart * featureValues.sectionStart,
    sectionEnd: weights.sectionEnd * featureValues.sectionEnd,
    contiguousRepeat: weights.contiguousRepeat * featureValues.contiguousRepeat,
  };

  const totalScore =
    weightedContributions.core +
    weightedContributions.length +
    weightedContributions.sectionStart +
    weightedContributions.sectionEnd +
    weightedContributions.contiguousRepeat;

  return { tile, totalScore, featureValues, weightedContributions };
};
