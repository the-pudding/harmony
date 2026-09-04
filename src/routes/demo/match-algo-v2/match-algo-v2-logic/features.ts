import { lengthPrior } from "./weights.js";

export type FeatureValues = {
  core: number;
  length: number;
  sectionStart: number;
  sectionEnd: number;
  contiguousRepeat: number;
};

export const coreFeature = (isCore: boolean): number => (isCore ? 1.0 : 0.0);

export const lengthFeature = (unitLength: number): number => lengthPrior(unitLength);

// 1.0 if tile begins at position 0 of the section; 0.4 for a 1-chord anacrusis;
// 0.1 for all other recursive tails (mid-section).
export const sectionStartFeature = (startIndex: number): number => {
  if (startIndex === 0) return 1.0;
  if (startIndex === 1) return 0.4;
  return 0.1;
};

// Whether the tile's run ends at or near the section boundary.
// runEnd = startIndex + coveredLength (full repeats only, before prefix absorption)
// totalEnd = startIndex + coveredLength + prefixLeftoverLength (after absorbing prefix)
export const sectionEndFeature = (
  startIndex: number,
  coveredLength: number,
  prefixLeftoverLength: number,
  sectionLength: number
): number => {
  const runEnd = startIndex + coveredLength;
  const totalEnd = startIndex + coveredLength + prefixLeftoverLength;
  if (runEnd === sectionLength) return 1.0;
  if (totalEnd === sectionLength) return 0.6;
  return 0.15;
};

// Saturating reward for back-to-back repeats within the section.
// 1 repeat → 0.25, 2 → 0.75, 3+ → 1.0
export const contiguousRepeatFeature = (repeatCount: number): number => {
  if (repeatCount <= 0) return 0.0;
  if (repeatCount === 1) return 0.25;
  if (repeatCount === 2) return 0.75;
  return 1.0;
};

export const computeFeatureValues = (
  isCore: boolean,
  unitLength: number,
  startIndex: number,
  coveredLength: number,
  prefixLeftoverLength: number,
  repeatCount: number,
  sectionLength: number
): FeatureValues => ({
  core: coreFeature(isCore),
  length: lengthFeature(unitLength),
  sectionStart: sectionStartFeature(startIndex),
  sectionEnd: sectionEndFeature(startIndex, coveredLength, prefixLeftoverLength, sectionLength),
  contiguousRepeat: contiguousRepeatFeature(repeatCount),
});
