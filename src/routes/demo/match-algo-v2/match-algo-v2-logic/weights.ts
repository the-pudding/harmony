export type MatchWeights = {
  core: number;
  length: number;
  sectionStart: number;
  sectionEnd: number;
  contiguousRepeat: number;
};

export const DEFAULT_WEIGHTS: MatchWeights = {
  core: 0.8,
  length: 1.0,
  sectionStart: 1.0,
  sectionEnd: 0.5,
  contiguousRepeat: 1.0,
};

// Prior curve mapping unit chord count to a 0-1 desirability value.
// 3 and 4 are the sweet spot; 5+ are rarer in practice.
export const LENGTH_PRIOR: Readonly<Record<number, number>> = {
  3: 0.95,
  4: 1.0,
  5: 0.35,
  6: 0.2,
};

export const lengthPrior = (length: number): number =>
  LENGTH_PRIOR[length] ?? 0.0;
