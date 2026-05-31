import { hasDistinctBass } from "./chord-classifier/index.js";
import { MAJOR, MINOR } from "./chord-classifier/fuzzySuffixMap.js";
import { NOTE_NAMES } from "./chord-classifier/notes.js";
import type { ChordClassification, StructuredChord } from "./types.js";

export const UNKNOWN_CHORD_NAME = "unknown";

const formatSuffixLabel = (suffix: string): string => {
	if (suffix === MAJOR) return "";
	if (suffix === MINOR || suffix.startsWith(MINOR))
		return suffix.replace(/^minor/, "m");
	return ` ${suffix}`;
};

export const formatChordName = (
	chord: ChordClassification | StructuredChord | null
): string => {
	if (!chord) return UNKNOWN_CHORD_NAME;
	const { rootPitchClass, suffix, bassPitchClass } = chord;
	const base = `${NOTE_NAMES[rootPitchClass]}${formatSuffixLabel(suffix)}`;
	return hasDistinctBass({ rootPitchClass, bassPitchClass })
		? `${base} / ${NOTE_NAMES[bassPitchClass!]}`
		: base;
};
