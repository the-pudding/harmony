import coreProgressions from "$data/core-progressions.js";
import {
	tonalityOfScale,
	type KeyTonality
} from "$routes/demo/design/chord-viz/diatonicChords.js";

// A progression's chords as roman numerals, in order, plus the key they're
// written in.
export type ProgressionChords = {
	tonality: KeyTonality;
	chords: string[];
};

const CORE_CHORDS_BY_NAME = new Map<string, ProgressionChords>(
	coreProgressions.map((progression) => {
		const written = Array.isArray(progression.chordProgression)
			? progression.chordProgression[0]
			: progression.chordProgression;
		return [
			progression.name,
			{
				tonality: tonalityOfScale(progression.scale),
				chords: written.split("-")
			}
		];
	})
);

const ROMAN_TOKEN = /^[b#]?(?:[iv]+|[IV]+)°?$/;
const MINOR_KEY_MAJOR_CHORD = /^b?(?:III|VI|VII)$/;

// Non-core progressions are named by their literal roman numerals (e.g.
// "I-ii-I"), with no key stored. Read the key off the chords: a minor tonic
// means minor; otherwise a major tonic means major; otherwise III, VI or
// VII (the major chords of a minor key) mean minor.
const inferTonality = (chords: readonly string[]): KeyTonality => {
	if (chords.includes("i")) return "minor";
	if (chords.includes("I")) return "major";
	return chords.some((chord) => MINOR_KEY_MAJOR_CHORD.test(chord))
		? "minor"
		: "major";
};

// The chords of the progression with this name: a core progression's first
// written form, or a non-core name read as roman numerals. Null when the
// name is neither.
export const progressionChordsByName = (
	name: string
): ProgressionChords | null => {
	const core = CORE_CHORDS_BY_NAME.get(name);
	if (core) return core;
	const chords = name.split("-");
	if (chords.length < 2 || !chords.every((chord) => ROMAN_TOKEN.test(chord)))
		return null;
	return { tonality: inferTonality(chords), chords };
};
