import { NOTES_PER_OCTAVE } from "./chord-classifier/notes.js";
import { formatChordName } from "./formatChordDisplay.js";
import type {
	ParsedProgressionChord,
	PrecomputedAbstractProgression
} from "./types.js";

const ROMAN_BASE = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;

const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11] as const;

const ROMAN_NUMERAL_TO_DEGREE = Object.fromEntries(
	ROMAN_BASE.map((numeral, index) => [numeral, index + 1])
) as Record<(typeof ROMAN_BASE)[number], number>;

const ROMAN_QUALITY_TO_SUFFIX: Record<string, string> = {
	maj: "major",
	min: "minor",
	dim: "diminished",
	aug: "augmented"
};

const intervalBetweenScaleDegrees = (
	fromDegree: number,
	toDegree: number
): number => {
	const fromPitchClass = MAJOR_SCALE_INTERVALS[fromDegree - 1];
	const toPitchClass = MAJOR_SCALE_INTERVALS[toDegree - 1];
	return (toPitchClass - fromPitchClass + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE;
};

export const degreeQualityToRoman = (
	degree: number,
	quality: string
): string | null => {
	if (degree < 1 || degree > ROMAN_BASE.length) return null;

	const base = ROMAN_BASE[degree - 1];

	if (quality === "maj") return base;
	if (quality === "min") return base.toLowerCase();
	if (quality === "dim") return `${base.toLowerCase()}°`;
	if (quality === "aug") return `${base}+`;

	return null;
};

export const gramLabel = (tokens: string[]): string => tokens.join("→");

export const dedupeAdjacentTokens = (tokens: string[]): string[] =>
	tokens.filter((token, index) => index === 0 || token !== tokens[index - 1]);

const romanBaseToDegree = (base: string): number | null => {
	const normalized = base.toUpperCase();
	return (
		ROMAN_NUMERAL_TO_DEGREE[
			normalized as keyof typeof ROMAN_NUMERAL_TO_DEGREE
		] ?? null
	);
};

type ParsedToken = { degree: number; quality: string; flat: boolean };

export const parseRomanToken = (token: string): ParsedToken | null => {
	// Strip a leading 'b' flat prefix if the rest is a valid roman numeral base
	let t = token;
	let flat = false;
	if (t.startsWith("b") && t.length > 1) {
		const rest = t.slice(1);
		// Strip any trailing quality suffix before testing the base
		const base = rest.replace(/[°+]$/, "");
		if (romanBaseToDegree(base) !== null) {
			flat = true;
			t = rest;
		}
	}

	if (t.endsWith("°")) {
		const degree = romanBaseToDegree(t.slice(0, -1));
		return degree ? { degree, quality: "dim", flat } : null;
	}

	if (t.endsWith("+")) {
		const degree = romanBaseToDegree(t.slice(0, -1));
		return degree ? { degree, quality: "aug", flat } : null;
	}

	const degree = romanBaseToDegree(t);
	if (!degree) return null;

	const quality = t === t.toUpperCase() ? "maj" : "min";
	return { degree, quality, flat };
};

const pitchClassFromEntry = (entry: ParsedToken): number =>
	(MAJOR_SCALE_INTERVALS[entry.degree - 1] - (entry.flat ? 1 : 0) + NOTES_PER_OCTAVE) %
	NOTES_PER_OCTAVE;

export const romanTokensToPrecomputedAbstract = (
	tokens: string[]
): PrecomputedAbstractProgression | null => {
	const parsed = tokens.map(parseRomanToken);
	if (parsed.some((entry) => entry === null)) return null;

	const validParsed = parsed.filter(
		(entry): entry is ParsedToken => entry !== null
	);
	const suffixes = validParsed.map(
		({ quality }) => ROMAN_QUALITY_TO_SUFFIX[quality] ?? null
	);
	if (suffixes.some((suffix) => suffix === null)) return null;

	const pitchClasses = validParsed.map((entry) => pitchClassFromEntry(entry));
	const deltas = pitchClasses
		.slice(1)
		.map((pc, index) => (pc - pitchClasses[index] + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE);
	const wrapDelta =
		pitchClasses.length > 1
			? (pitchClasses[0] - pitchClasses[pitchClasses.length - 1] + NOTES_PER_OCTAVE) %
				NOTES_PER_OCTAVE
			: 0;

	return {
		suffixes: suffixes as string[],
		deltas,
		bassIntervals: suffixes.map(() => null),
		wrapDelta
	};
};

export const romanTokensToParsedProgression = (
	tokens: string[]
): ParsedProgressionChord[] | null => {
	const parsed = tokens.map(parseRomanToken);
	if (parsed.some((entry) => entry === null)) return null;

	const chords = parsed.map((entry) => {
		const suffix = ROMAN_QUALITY_TO_SUFFIX[entry!.quality];
		if (!suffix) return null;
		const rootPitchClass = pitchClassFromEntry(entry!);
		const chord = { rootPitchClass, suffix };
		return { ...chord, display: formatChordName(chord) };
	});

	if (chords.some((chord) => chord === null)) return null;

	return chords as ParsedProgressionChord[];
};
