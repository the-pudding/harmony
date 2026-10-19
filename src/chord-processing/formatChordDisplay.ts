import { hasDistinctBass } from "./chord-classifier/index.js";
import { MAJOR, MINOR } from "./chord-classifier/fuzzySuffixMap.js";
import { NOTE_NAMES, noteNameToPitchClass } from "./chord-classifier/notes.js";
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

const CHORD_NAME_PATTERN = /^([A-G][b#]?)(.*?)(?: \/ ([A-G][b#]?))?$/;

const suffixFromLabel = (label: string): string => {
	if (label === "") return MAJOR;
	if (label.startsWith(" ")) return label.slice(1);
	if (label.startsWith("m")) return `${MINOR}${label.slice(1)}`;
	return label;
};

// The inverse of formatChordName: "F#m7 / A" → F# minor7 over A.
export const parseChordName = (name: string): StructuredChord | null => {
	const match = name.match(CHORD_NAME_PATTERN);
	if (!match) return null;
	const [, root, label, bass] = match;
	try {
		const chord = {
			rootPitchClass: noteNameToPitchClass(root),
			suffix: suffixFromLabel(label)
		};
		return bass
			? { ...chord, bassPitchClass: noteNameToPitchClass(bass) }
			: chord;
	} catch {
		return null;
	}
};
