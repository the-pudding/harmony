import type { SongSection } from "../../../../data/songBrowser.js";
import type { CoreProgression } from "$data/core-progressions.js";
import type { CoreLookupEntry } from "../../define-chord-progression/progression-matching-logic/progressionMatchAnalysis.js";
import {
	collapseAdjacentRepeatedChords,
	originalPositionsFromCollapsedRange,
	type OriginalRange
} from "../../define-chord-progression/progression-matching-logic/collapsedProgression.js";
import type { MatchWeights } from "./weights.js";
import type { ScoredTile } from "./score.js";
import { computeScoredTile } from "./score.js";
import { generateCandidates } from "./candidates.js";

const collapseSectionRepeatedChords = (
	section: SongSection
): {
	section: SongSection;
	originalRanges: OriginalRange[];
} => {
	const { chords, originalRanges } = collapseAdjacentRepeatedChords(
		section.parsedProgression
	);
	return {
		section: {
			...section,
			parsedProgression: chords,
			romanTokens: originalRanges.map(
				(range) => section.romanTokens[range.start] ?? ""
			)
		},
		originalRanges
	};
};

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
	coreEntries: CoreLookupEntry[],
	weights: MatchWeights,
	startIndex = 0
): TileSpan[] => {
	const collapsed = collapseSectionRepeatedChords(section);
	if (startIndex >= collapsed.section.parsedProgression.length) return [];

	const candidates = generateCandidates(
		collapsed.section,
		startIndex,
		coreProgressions,
		coreEntries
	);
	if (candidates.length === 0) return [];

	const scored = candidates.map((c) =>
		computeScoredTile(c, collapsed.section.parsedProgression.length, weights)
	);

	const best = scored.reduce((prev, curr) =>
		curr.totalScore > prev.totalScore ? curr : prev
	);

	const highlightPositions = originalPositionsFromCollapsedRange(
		collapsed.originalRanges,
		best.tile.startIndex,
		best.tile.coveredLength
	);

	const span: TileSpan = {
		sectionIndex,
		tile: best,
		highlightPositions,
		rejectedAtSameStart: scored.filter((s) => s !== best)
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
			coreEntries,
			weights,
			nextStart
		)
	];
};
