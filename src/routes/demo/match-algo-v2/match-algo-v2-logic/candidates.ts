import type { ParsedProgressionChord } from "../../../../chord-processing/types.js";
import type { CoreProgression } from "$data/core-progressions.js";
import type { SongSection } from "../../../../data/songBrowser.js";
import { hasConsecutivelyRepeatedBlock } from "../../define-chord-progression/progression-matching-logic/progressionConstraints.js";
import { chordProgressionVariants } from "$data/core-progressions.util.js";
import { romanTokensToParsedProgression } from "../../../../chord-processing/romanNumerals.js";
import {
	lookupCoreEntry,
	matchSectionProgressionExactly,
	tonicOffsetAt,
	type CoreLookupEntry
} from "../../define-chord-progression/progression-matching-logic/progressionMatchAnalysis.js";

export type CandidateTile = {
	unit: ParsedProgressionChord[];
	unitRomanString: string;
	unitTonicOffset: number | null;
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
	section: SongSection,
	startIndex: number,
	unit: ParsedProgressionChord[],
	unitTonicOffset: number | null
): { repeatCount: number; coveredLength: number } => {
	const sorted = [
		...matchSectionProgressionExactly(section, unit, unitTonicOffset, startIndex)
	].sort((a, b) => a.start - b.start);
	let repeatCount = 0;
	let pos = startIndex;
	for (const match of sorted) {
		if (match.start === pos) {
			repeatCount++;
			pos += match.length;
		} else if (match.start > pos) {
			break;
		}
	}
	return { repeatCount, coveredLength: pos - startIndex };
};

const detectPrefixLeftover = (
	section: SongSection,
	afterIndex: number,
	unit: ParsedProgressionChord[],
	unitTonicOffset: number | null
): number => {
	const remainingLength = section.parsedProgression.length - afterIndex;
	if (remainingLength <= 0 || remainingLength >= unit.length) return 0;
	const prefixUnit = unit.slice(0, remainingLength);
	const matches = matchSectionProgressionExactly(
		section,
		prefixUnit,
		unitTonicOffset,
		afterIndex
	);
	const fullMatch = matches.find(
		(m) => m.start === afterIndex && m.length === remainingLength
	);
	return fullMatch ? remainingLength : 0;
};

// Path A: generate non-self-repeating literal section slices, annotating
// cores that match the slice's exact roman numerals.
const generateLiteralSliceCandidates = (
	section: SongSection,
	startIndex: number,
	coreEntries: CoreLookupEntry[]
): CandidateTile[] => {
	const sectionChords = section.parsedProgression;
	const sectionLength = sectionChords.length;
	const unitTonicOffset = tonicOffsetAt(section, startIndex);
	const results: CandidateTile[] = [];

	for (let L = MIN_CANDIDATE_LENGTH; L <= MAX_CANDIDATE_LENGTH; L++) {
		if (startIndex + L > sectionLength) break;

		const romanString = section.romanTokens
			.slice(startIndex, startIndex + L)
			.join("-");
		if (hasConsecutivelyRepeatedBlock(romanString.split("-"), 2)) continue;

		const unit = sectionChords.slice(startIndex, startIndex + L);
		const { repeatCount, coveredLength } = countContiguousRepeats(
			section,
			startIndex,
			unit,
			unitTonicOffset
		);
		if (repeatCount === 0) continue;

		const prefixLeftoverLength = detectPrefixLeftover(
			section,
			startIndex + coveredLength,
			unit,
			unitTonicOffset
		);

		const coreEntry = lookupCoreEntry(coreEntries, unit, section, startIndex);

		results.push({
			unit,
			unitRomanString: romanString,
			unitTonicOffset,
			startIndex,
			repeatCount,
			coveredLength,
			prefixLeftoverLength,
			isCore: coreEntry !== undefined,
			coreName: coreEntry?.name
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
	const results: CandidateTile[] = [];

	for (const core of coreProgressions) {
		const variants = chordProgressionVariants(core.chordProgression);
		for (const variant of variants) {
			if (!hasConsecutivelyRepeatedBlock(variant.split("-"), 2)) continue;
			const tokens = variant.split("-");
			if (
				tokens.length < MIN_CANDIDATE_LENGTH ||
				tokens.length > MAX_CANDIDATE_LENGTH
			)
				continue;

			const parsedCore = romanTokensToParsedProgression(tokens, core.scale);
			if (!parsedCore) continue;

			const unitTonicOffset = parsedCore[0].rootPitchClass;
			const { repeatCount, coveredLength } = countContiguousRepeats(
				section,
				startIndex,
				parsedCore,
				unitTonicOffset
			);
			if (repeatCount === 0) continue;

			const prefixLeftoverLength = detectPrefixLeftover(
				section,
				startIndex + coveredLength,
				parsedCore,
				unitTonicOffset
			);

			results.push({
				unit: parsedCore,
				unitRomanString: variant,
				unitTonicOffset,
				startIndex,
				repeatCount,
				coveredLength,
				prefixLeftoverLength,
				isCore: true,
				coreName: core.name
			});
		}
	}

	return results;
};

export const generateCandidates = (
	section: SongSection,
	startIndex: number,
	coreProgressions: CoreProgression[],
	coreEntries: CoreLookupEntry[]
): CandidateTile[] => {
	const pathA = generateLiteralSliceCandidates(
		section,
		startIndex,
		coreEntries
	);
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
		...pathB.filter(
			(c) => !seenKeys.has(`${c.unitRomanString}|${section.scale}`)
		)
	];
};
