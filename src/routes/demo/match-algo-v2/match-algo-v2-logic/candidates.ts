import type { ParsedProgressionChord } from "../../../../chord-processing/types.js";
import type { CoreProgression } from "$data/core-progressions.js";
import type { SongSection } from "../../../../data/songBrowser.js";
import {
  matchProgressionSelectiveExactness,
} from "../../define-chord-progression/progression-matching-logic/collapsedProgression.js";
import { isSelfRepeatingProgression } from "../../define-chord-progression/progression-matching-logic/progressionConstraints.js";
import { chordProgressionVariants } from "$data/core-progressions.util.js";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";
import {
  abstractProgressionKey,
  scopedToScale,
} from "../../define-chord-progression/progression-matching-logic/progressionMatchAnalysis.js";

export type CandidateTile = {
  unit: ParsedProgressionChord[];
  unitRomanString: string;
  startIndex: number;
  repeatCount: number;
  coveredLength: number;
  prefixLeftoverLength: number;
  isCore: boolean;
  coreName?: string;
};

export const MIN_CANDIDATE_LENGTH = 3;
export const MAX_CANDIDATE_LENGTH = 6;

export const countContiguousRepeats = (
  sectionChords: ParsedProgressionChord[],
  startIndex: number,
  unit: ParsedProgressionChord[]
): { repeatCount: number; coveredLength: number } => {
  const tail = sectionChords.slice(startIndex);
  const allMatches = matchProgressionSelectiveExactness(tail, unit);
  const sorted = [...allMatches].sort((a, b) => a.start - b.start);
  let repeatCount = 0;
  let pos = 0;
  for (const match of sorted) {
    if (match.start === pos) {
      repeatCount++;
      pos += match.length;
    } else if (match.start > pos) {
      break;
    }
  }
  return { repeatCount, coveredLength: pos };
};

const detectPrefixLeftover = (
  sectionChords: ParsedProgressionChord[],
  afterIndex: number,
  unit: ParsedProgressionChord[]
): number => {
  const remaining = sectionChords.slice(afterIndex);
  if (remaining.length === 0 || remaining.length >= unit.length) return 0;
  const prefixUnit = unit.slice(0, remaining.length);
  const matches = matchProgressionSelectiveExactness(remaining, prefixUnit);
  const fullMatch = matches.find(
    (m) => m.start === 0 && m.start + m.length === remaining.length
  );
  return fullMatch ? remaining.length : 0;
};

// Path A: generate non-self-repeating literal section slices, annotating
// cores via the prebuilt coreNameByKey lookup map.
const generateLiteralSliceCandidates = (
  section: SongSection,
  startIndex: number,
  coreNameByKey: Map<string, string>
): CandidateTile[] => {
  const sectionChords = section.parsedProgression;
  const sectionLength = sectionChords.length;
  const results: CandidateTile[] = [];

  for (let L = MIN_CANDIDATE_LENGTH; L <= MAX_CANDIDATE_LENGTH; L++) {
    if (startIndex + L > sectionLength) break;

    const romanString = section.romanTokens
      .slice(startIndex, startIndex + L)
      .join("-");
    if (isSelfRepeatingProgression(romanString)) continue;

    const unit = sectionChords.slice(startIndex, startIndex + L);
    const { repeatCount, coveredLength } = countContiguousRepeats(
      sectionChords,
      startIndex,
      unit
    );
    if (repeatCount === 0) continue;

    const prefixLeftoverLength = detectPrefixLeftover(
      sectionChords,
      startIndex + coveredLength,
      unit
    );

    const absKey = scopedToScale(abstractProgressionKey(unit), section.scale);
    const coreName = coreNameByKey.get(absKey);

    results.push({
      unit,
      unitRomanString: romanString,
      startIndex,
      repeatCount,
      coveredLength,
      prefixLeftoverLength,
      isCore: coreName !== undefined,
      coreName,
    });
  }

  return results;
};

// Path B: self-repeating cores (e.g. I-V-I-V, I-vi-I-vi) skipped by path A.
// We parse them with the core's scale and try to match at startIndex.
const generateSelfRepeatingCoreCandidates = (
  section: SongSection,
  startIndex: number,
  coreProgressions: CoreProgression[]
): CandidateTile[] => {
  const sectionChords = section.parsedProgression;
  const results: CandidateTile[] = [];

  for (const core of coreProgressions) {
    const variants = chordProgressionVariants(core.chordProgression);
    for (const variant of variants) {
      if (!isSelfRepeatingProgression(variant)) continue;
      const tokens = variant.split("-");
      if (
        tokens.length < MIN_CANDIDATE_LENGTH ||
        tokens.length > MAX_CANDIDATE_LENGTH
      )
        continue;

      const parsedCore = romanTokensToParsedProgression(tokens, core.scale);
      if (!parsedCore) continue;

      const tail = sectionChords.slice(startIndex);
      const tailMatches = matchProgressionSelectiveExactness(tail, parsedCore);
      if (!tailMatches.some((m) => m.start === 0)) continue;

      const { repeatCount, coveredLength } = countContiguousRepeats(
        sectionChords,
        startIndex,
        parsedCore
      );
      if (repeatCount === 0) continue;

      const prefixLeftoverLength = detectPrefixLeftover(
        sectionChords,
        startIndex + coveredLength,
        parsedCore
      );

      results.push({
        unit: parsedCore,
        unitRomanString: variant,
        startIndex,
        repeatCount,
        coveredLength,
        prefixLeftoverLength,
        isCore: true,
        coreName: core.name,
      });
    }
  }

  return results;
};

export const generateCandidates = (
  section: SongSection,
  startIndex: number,
  coreProgressions: CoreProgression[],
  coreNameByKey: Map<string, string>
): CandidateTile[] => {
  const pathA = generateLiteralSliceCandidates(section, startIndex, coreNameByKey);
  const pathB = generateSelfRepeatingCoreCandidates(
    section,
    startIndex,
    coreProgressions
  );

  const seenKeys = new Set(
    pathA.map((c) => `${c.unitRomanString}|${section.scale}`)
  );
  return [
    ...pathA,
    ...pathB.filter((c) => !seenKeys.has(`${c.unitRomanString}|${section.scale}`)),
  ];
};
