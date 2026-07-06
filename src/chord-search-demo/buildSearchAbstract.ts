import { simplifySuffix } from "../chord-processing/chord-classifier/fuzzySuffixMap.js";
import { dedupeAdjacentParsedProgression } from "../chord-processing/match-chord-progressions/dedupe.js";
import { toAbstractProgression } from "../chord-processing/match-chord-progressions/match.js";
import type {
	AbstractProgression,
	ParsedProgressionChord
} from "../chord-processing/types.js";

export type BuildSearchAbstractOptions = {
	ignoreSlashBassNotes: boolean;
	fuzzySearch: boolean;
};

export const buildSearchAbstract = (
	chords: ParsedProgressionChord[],
	{ ignoreSlashBassNotes, fuzzySearch }: BuildSearchAbstractOptions
): AbstractProgression | null => {
	const effectiveChords = ignoreSlashBassNotes
		? chords.map(
				({ bassPitchClass: _bass, ...chord }) => chord as ParsedProgressionChord
			)
		: chords;

	if (effectiveChords.length === 0) return null;

	const abstract = toAbstractProgression(
		dedupeAdjacentParsedProgression(effectiveChords)
	);

	return fuzzySearch
		? {
				...abstract,
				suffixes: abstract.suffixes.map(simplifySuffix)
			}
		: abstract;
};
