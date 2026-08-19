import { NOTES_PER_OCTAVE } from "./chord-classifier/notes.js";
import { formatChordName } from "./formatChordDisplay.js";
import type {
	ParsedProgressionChord,
	PrecomputedAbstractProgression
} from "./types.js";
import { SCALE_INTERVALS, type ScaleName } from "./scale-intervals.js";

export type { ScaleName };

const ROMAN_BASE = ["I", "II", "III", "IV", "V", "VI", "VII"] as const;

const ROMAN_NUMERAL_TO_DEGREE = Object.fromEntries(
	ROMAN_BASE.map((numeral, index) => [numeral, index + 1])
) as Record<(typeof ROMAN_BASE)[number], number>;

const ROMAN_QUALITY_TO_SUFFIX: Record<string, string> = {
	maj: "major",
	min: "minor",
	dim: "diminished",
	aug: "augmented"
};

// Ordered longest-first so "maj7" is tried before "7", etc.
const EXTENSION_SUFFIXES = [
	"maj7",
	"maj9",
	"m7b5",
	"dim7",
	"7sus4",
	"sus4",
	"sus2",
	"add9",
	"add6",
	"m7",
	"7",
	"9",
	"6"
] as const;

const peelExtension = (t: string): [base: string, ext: string | null] => {
	for (const ext of EXTENSION_SUFFIXES) {
		if (t.endsWith(ext)) return [t.slice(0, -ext.length), ext];
	}
	return [t, null];
};

const extensionSuffixForQuality = (
	quality: string,
	ext: string | null
): string | null => {
	if (!ext) return ROMAN_QUALITY_TO_SUFFIX[quality] ?? null;
	if (ext === "maj7" || ext === "maj9") return ext;
	if (ext === "7sus4" || ext === "sus4" || ext === "sus2") return ext;
	if (ext === "add9") return "add9";
	if (ext === "add6") return "6";
	if (ext === "m7b5") return "m7b5";
	if (ext === "dim7") return "dim7";
	if (ext === "m7") return quality === "min" ? "minor7" : null;
	if (ext === "7") {
		if (quality === "maj") return "7";
		if (quality === "min") return "minor7";
		if (quality === "dim") return "dim7";
		return null;
	}
	if (ext === "9")
		return quality === "maj" ? "9" : quality === "min" ? "minor9" : null;
	if (ext === "6") return "6";
	return null;
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

export const BASE_CHORD_SUFFIXES = new Set([
	"major",
	"minor",
	"diminished",
	"augmented"
]);

const suffixToRomanExtension = (suffix: string, quality: string): string => {
	if (BASE_CHORD_SUFFIXES.has(suffix)) return "";

	switch (suffix) {
		case "maj7":
			return "maj7";
		case "maj9":
			return "maj9";
		case "7":
			return "7";
		case "9":
			return "9";
		case "minor7":
			return quality === "min" ? "7" : "m7";
		case "minor9":
			return "9";
		case "sus2":
			return "sus2";
		case "sus4":
			return "sus4";
		case "7sus4":
			return "7sus4";
		case "add9":
			return "add9";
		case "6":
			return "6";
		case "m7b5":
			return "m7b5";
		case "dim7":
			return "dim7";
		default:
			return "";
	}
};

const bareRomanNumeralFromToken = (token: string): string | null => {
	const parsed = parseRomanToken(token);
	if (!parsed) return null;

	const base = degreeQualityToRoman(parsed.degree, parsed.quality);
	if (!base) return null;

	return parsed.flat ? `b${base}` : base;
};

export const formatRomanTokenFromParsed = (
	baseRomanToken: string,
	chord: ParsedProgressionChord | undefined
): string => {
	if (!chord) return baseRomanToken;

	const parsedFromToken = parseRomanToken(baseRomanToken);
	if (!parsedFromToken) return baseRomanToken;

	if (parsedFromToken.suffix === chord.suffix) return baseRomanToken;

	const bareNumeral = bareRomanNumeralFromToken(baseRomanToken);
	if (!bareNumeral) return baseRomanToken;

	const extension = suffixToRomanExtension(
		chord.suffix,
		parsedFromToken.quality
	);
	return `${bareNumeral}${extension}`;
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

type ParsedToken = {
	degree: number;
	quality: string;
	flat: boolean;
	suffix: string;
	bassDegree?: number;
	bassFlat?: boolean;
};

export const parseRomanToken = (token: string): ParsedToken | null => {
	// Strip outer parentheses: "(IV)" → "IV", "(IVmaj7)" → "IVmaj7"
	let t = token.replace(/^\(([^)]+)\)$/, "$1");

	// Slash bass as a roman numeral (I/V). Figured-bass / digit inversions (V/3)
	// and secondary dominants with non-roman tails stay stripped.
	let bassDegree: number | undefined;
	let bassFlat: boolean | undefined;
	const slashIdx = t.indexOf("/");
	if (slashIdx !== -1) {
		const bassToken = t.slice(slashIdx + 1);
		t = t.slice(0, slashIdx);
		const bassParsed = parseRomanToken(bassToken);
		if (bassParsed) {
			bassDegree = bassParsed.degree;
			bassFlat = bassParsed.flat;
		}
	}

	// Normalize parenthetical adds: "IV(add9)" → "IVadd9", "I(add6)" → "Iadd6"
	t = t.replace(/\(add(\d+)\)/, "add$1");

	// Peel extension from right
	const [base, ext] = peelExtension(t);
	t = base;

	let flat = false;
	if (t.startsWith("b") && t.length > 1) {
		const rest = t.slice(1);
		const baseForCheck = rest.replace(/[°+]$/, "");
		if (romanBaseToDegree(baseForCheck) !== null) {
			flat = true;
			t = rest;
		}
	}

	let quality: string;
	let degree: number | null;

	if (t.endsWith("°")) {
		degree = romanBaseToDegree(t.slice(0, -1));
		quality = "dim";
	} else if (t.endsWith("+")) {
		degree = romanBaseToDegree(t.slice(0, -1));
		quality = "aug";
	} else {
		degree = romanBaseToDegree(t);
		quality = t === t.toUpperCase() ? "maj" : "min";
	}

	if (!degree) return null;

	const suffix = extensionSuffixForQuality(quality, ext);
	if (!suffix) return null;

	return {
		degree,
		quality,
		flat,
		suffix,
		...(bassDegree !== undefined
			? { bassDegree, bassFlat: bassFlat ?? false }
			: {})
	};
};

const pitchClassFromEntry = (
	entry: ParsedToken,
	scale: ScaleName = "major"
): number => {
	const intervals = SCALE_INTERVALS[scale];
	return (
		(intervals[entry.degree - 1] - (entry.flat ? 1 : 0) + NOTES_PER_OCTAVE) %
		NOTES_PER_OCTAVE
	);
};

export const romanTokenOffsetFromTonic = (
	token: string,
	scale: ScaleName
): number | null => {
	const parsed = parseRomanToken(token);
	if (!parsed) return null;
	return pitchClassFromEntry(parsed, scale);
};

export const romanTokensToPrecomputedAbstract = (
	tokens: string[],
	scale: ScaleName = "major"
): PrecomputedAbstractProgression | null => {
	const parsed = tokens.map(parseRomanToken);
	if (parsed.some((entry) => entry === null)) return null;

	const validParsed = parsed.filter(
		(entry): entry is ParsedToken => entry !== null
	);
	const suffixes = validParsed.map(({ suffix }) => suffix);

	const pitchClasses = validParsed.map((entry) =>
		pitchClassFromEntry(entry, scale)
	);
	const deltas = pitchClasses
		.slice(1)
		.map(
			(pc, index) =>
				(pc - pitchClasses[index] + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE
		);
	const wrapDelta =
		pitchClasses.length > 1
			? (pitchClasses[0] -
					pitchClasses[pitchClasses.length - 1] +
					NOTES_PER_OCTAVE) %
				NOTES_PER_OCTAVE
			: 0;

	return {
		suffixes,
		deltas,
		bassIntervals: suffixes.map(() => null),
		wrapDelta
	};
};

export const romanTokensToParsedProgression = (
	tokens: string[],
	scale: ScaleName = "major"
): ParsedProgressionChord[] | null => {
	const parsed = tokens.map(parseRomanToken);
	if (parsed.some((entry) => entry === null)) return null;

	const chords = parsed.map((entry) => {
		const { suffix, bassDegree, bassFlat } = entry!;
		const rootPitchClass = pitchClassFromEntry(entry!, scale);
		const bassPitchClass =
			bassDegree !== undefined
				? pitchClassFromEntry(
						{
							degree: bassDegree,
							quality: "maj",
							flat: bassFlat ?? false,
							suffix: "major"
						},
						scale
					)
				: undefined;
		const hasDistinctBass =
			bassPitchClass !== undefined && bassPitchClass !== rootPitchClass;
		const chord = hasDistinctBass
			? { rootPitchClass, suffix, bassPitchClass }
			: { rootPitchClass, suffix };
		return { ...chord, display: formatChordName(chord) };
	});

	return chords as ParsedProgressionChord[];
};
