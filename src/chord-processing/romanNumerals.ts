import { NOTES_PER_OCTAVE } from "./chord-classifier/notes.js";
import type { PrecomputedAbstractProgression } from "./types.js";

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

export const parseRomanToken = (
	token: string
): { degree: number; quality: string } | null => {
	if (token.endsWith("°")) {
		const degree = romanBaseToDegree(token.slice(0, -1));
		return degree ? { degree, quality: "dim" } : null;
	}

	if (token.endsWith("+")) {
		const degree = romanBaseToDegree(token.slice(0, -1));
		return degree ? { degree, quality: "aug" } : null;
	}

	const degree = romanBaseToDegree(token);
	if (!degree) return null;

	const quality = token === token.toUpperCase() ? "maj" : "min";
	return { degree, quality };
};

export const romanTokensToPrecomputedAbstract = (
	tokens: string[]
): PrecomputedAbstractProgression | null => {
	const parsed = tokens.map(parseRomanToken);
	if (parsed.some((entry) => entry === null)) return null;

	const degrees = parsed.map((entry) => entry!.degree);
	const suffixes = parsed.map(
		({ quality }) => ROMAN_QUALITY_TO_SUFFIX[quality] ?? null
	);
	if (suffixes.some((suffix) => suffix === null)) return null;

	const deltas = degrees
		.slice(1)
		.map((toDegree, index) =>
			intervalBetweenScaleDegrees(degrees[index], toDegree)
		);
	const wrapDelta =
		degrees.length > 1
			? intervalBetweenScaleDegrees(degrees[degrees.length - 1], degrees[0])
			: 0;

	return {
		suffixes: suffixes as string[],
		deltas,
		bassIntervals: suffixes.map(() => null),
		wrapDelta
	};
};
