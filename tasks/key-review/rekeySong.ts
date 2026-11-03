import {
	canonicalNoteName,
	pitchClassName,
	toPitchClass
} from "./pitchClasses.js";
import type {
	ProgressionChordInput,
	SongInput
} from "../../src/chord-processing/types.js";
import { respellRomanToken } from "./modeSpelling.js";
import {
	ledgerRowChangesSong,
	type LedgerRow,
	type SongKeySnapshot
} from "./ledger.js";

const transposeNoteName = (noteName: string, semitones: number): string =>
	pitchClassName(toPitchClass(noteName) + semitones);

const transposeChord = (
	chord: ProgressionChordInput,
	semitones: number
): ProgressionChordInput => ({
	...chord,
	noteName: transposeNoteName(chord.noteName, semitones),
	...(chord.bassNoteName
		? { bassNoteName: transposeNoteName(chord.bassNoteName, semitones) }
		: {})
});

const isLabeledSection = (
	section: SongInput,
	snapshot: SongKeySnapshot
): boolean =>
	section.key !== undefined &&
	toPitchClass(section.key) === toPitchClass(snapshot.labeledKey) &&
	section.scale === snapshot.labeledScale;

const relabelRomanTokens = (
	section: SongInput,
	row: LedgerRow,
	snapshot: SongKeySnapshot
): string[] => {
	const tokens = section.romanTokens ?? [];
	if (tokens.length !== section.progression.length) {
		throw new Error(
			`Cannot rekey "${section.id}": ${tokens.length} roman tokens for ${section.progression.length} chords`
		);
	}

	const newTonicPc = toPitchClass(row.key);
	const tonicShift =
		newTonicPc - toPitchClass(snapshot.labeledKey) - row.transpose;

	return tokens.map((token, index) =>
		respellRomanToken(token, {
			rootIntervalFromNewTonic:
				toPitchClass(section.progression[index].noteName) +
				row.transpose -
				newTonicPc,
			fromScale: snapshot.labeledScale,
			toScale: row.scale,
			tonicShift
		})
	);
};

/**
 * Rekey an individual section to a specific key/scale, respelling its roman
 * tokens under the new tonal centre. Used for section-level ledger overrides.
 *
 * `transpose` is the chromatic shift (semitones) applied to the progression
 * pitches. For relative/mode changes transpose is 0; for pitch-shifted
 * modulations it is non-zero.
 */
export const rekeySectionTo = (
	section: SongInput,
	newKey: string,
	newScale: string,
	transpose: number
): SongInput => {
	if (
		transpose === 0 &&
		section.key !== undefined &&
		toPitchClass(section.key) === toPitchClass(newKey) &&
		section.scale === newScale
	)
		return section;

	const progression = section.progression.map((chord) =>
		transposeChord(chord, transpose)
	);

	const tokens = section.romanTokens ?? [];
	const hasMatchingTokens = tokens.length === section.progression.length;

	const newTonicPc = toPitchClass(newKey);
	const oldTonicPc = toPitchClass(section.key ?? newKey);
	const tonicShift = newTonicPc - oldTonicPc - transpose;

	const romanTokens = hasMatchingTokens
		? tokens.map((token, index) =>
				respellRomanToken(token, {
					rootIntervalFromNewTonic:
						toPitchClass(section.progression[index].noteName) +
						transpose -
						newTonicPc,
					fromScale: section.scale ?? newScale,
					toScale: newScale,
					tonicShift
				})
			)
		: tokens;

	return {
		...section,
		progression,
		romanTokens,
		key: canonicalNoteName(newKey),
		scale: newScale
	};
};

export const rekeySection = (
	section: SongInput,
	row: LedgerRow,
	snapshot: SongKeySnapshot
): SongInput => {
	if (!ledgerRowChangesSong(row)) return section;

	const progression = section.progression.map((chord) =>
		transposeChord(chord, row.transpose)
	);

	if (!isLabeledSection(section, snapshot)) {
		return {
			...section,
			progression,
			...(section.key
				? { key: transposeNoteName(section.key, row.transpose) }
				: {})
		};
	}

	return {
		...section,
		progression,
		romanTokens: relabelRomanTokens(section, row, snapshot),
		key: canonicalNoteName(row.key),
		scale: row.scale
	};
};
