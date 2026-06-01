export { createChordDetector } from "./chord-detector.js";
export { createMidiInput } from "./midi-input/index.js";
export { createChordGater } from "./chord-gater/index.js";
export {
	bassIntervalFromRoot,
	chordsAreEqual,
	createChordClassifier,
	hasDistinctBass,
	structuredChordFromClassification
} from "./chord-classifier/index.js";
export { formatChordName, UNKNOWN_CHORD_NAME } from "./formatChordDisplay.js";
export { CHORD_TEMPLATES } from "./chord-classifier/templates.js";
export {
	midiToNote,
	noteToMidi,
	coerceToMidi,
	pitchClass,
	noteNameToPitchClass
} from "./chord-classifier/notes.js";
export {
	createProgressionSearch,
	toAbstractProgression,
	findSubProgressionMatches,
	progressionContainsSubProgression,
	dedupeAdjacentParsedProgression,
	dedupeAdjacentProgressionInputs,
	progressionChordInputsAreEqual
} from "./match-chord-progressions/index.js";
export { isPositionInMatch } from "./match-chord-progressions/match.js";
export type * from "./types.js";
