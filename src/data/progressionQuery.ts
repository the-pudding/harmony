// Reading a search box query as a chord progression ("ii V I", "Dm G C") and
// matching it against the progressions the map's clusters are named after.
//
// Both sides are reduced to "codes": each chord's root as semitones above
// the tonic plus its triad quality, with extensions, inversions and repeated
// chords folded away. Relative major and minor count as the same
// progression, so a progression also matches when shifted to its relative
// key (vi-IV-I-V ≡ i-VI-III-VII).
import { noteNameToPitchClass } from "../chord-processing/chord-classifier/notes.js";
import { diatonicQualityForDegree } from "../chord-processing/diatonicQuality.js";
import {
	SCALE_INTERVALS,
	type ScaleName
} from "../chord-processing/scale-intervals.js";
import { allProgressionGroups } from "./core-progressions.js";
import {
	canonicalChordProgressionByName,
	chordProgressionVariants
} from "./core-progressions.util.js";

type Quality = "maj" | "min" | "dim" | "aug";

const QUALITIES: readonly Quality[] = ["maj", "min", "dim", "aug"];
const SEMITONES = 12;
// Relative minor's tonic is 9 semitones above the major tonic, and the
// relative major's 3 above the minor tonic.
const RELATIVE_KEY_SHIFTS = [0, 3, 9];
// A progression query needs at least this many (distinct-in-a-row) chords.
const MIN_PROGRESSION_CHORDS = 2;

const codeFor = (offset: number, quality: Quality): number =>
	(((offset % SEMITONES) + SEMITONES) % SEMITONES) * QUALITIES.length +
	QUALITIES.indexOf(quality);

const shiftCode = (code: number, semitones: number): number =>
	codeFor(
		Math.floor(code / QUALITIES.length) + semitones,
		QUALITIES[code % QUALITIES.length]
	);

const dedupeAdjacent = (codes: number[]): number[] =>
	codes.filter((code, index) => index === 0 || code !== codes[index - 1]);

// ---------------------------------------------------------------- roman

const ROMAN_DEGREES = ["I", "II", "III", "IV", "V", "VI", "VII"];
const ROMAN_TOKEN =
	/^([b#♭♯]?)(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(°|o|ø|\+)?(maj7|maj9|maj|m7b5|m7|m9|dim7|7sus4|sus2|sus4|add9|add6|7|9|11|13|6)?$/;

type RomanChord = { accidental: number; degree: number; quality: Quality };

const parseRoman = (token: string): RomanChord | null => {
	const match = token.match(ROMAN_TOKEN);
	if (!match) return null;
	const [, accidental, numeral, mark] = match;
	const quality: Quality =
		mark === "°" || mark === "o" || mark === "ø"
			? "dim"
			: mark === "+"
				? "aug"
				: numeral === numeral.toUpperCase()
					? "maj"
					: "min";
	return {
		accidental: accidental === "b" || accidental === "♭" ? -1 : accidental ? 1 : 0,
		degree: ROMAN_DEGREES.indexOf(numeral.toUpperCase()) + 1,
		quality
	};
};

// A token as written in the data ("IVmaj7/3", "I(no3)", "iiø7", "(V)"),
// reduced to something parseRoman reads.
const cleanDataToken = (token: string): string =>
	token
		.replace(/^\((.+)\)$/, "$1")
		.replace(/\([^)]*\)/g, "")
		.replace(/\/.*$/, "")
		.replace(/ø/g, "°")
		.replace(/^([b#]?(?:VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)[°+]?).*$/, "$1");

// Which scale the numerals are counted in. Accidentals mean they're written
// against major (bIII, bVI, bVII); otherwise a minor tonic means minor.
const referenceScaleFor = (chords: RomanChord[]): ScaleName => {
	if (chords.some((chord) => chord.accidental !== 0)) return "major";
	const tonic = chords.find((chord) => chord.degree === 1);
	return tonic?.quality === "min" ? "minor" : "major";
};

const romanCodes = (
	chords: (RomanChord | null)[],
	scale: ScaleName = referenceScaleFor(
		chords.filter((chord): chord is RomanChord => chord !== null)
	)
): number[] | null => {
	if (chords.some((chord) => chord === null)) return null;
	const intervals = SCALE_INTERVALS[scale];
	return dedupeAdjacent(
		(chords as RomanChord[]).map((chord) =>
			codeFor(intervals[chord.degree - 1] + chord.accidental, chord.quality)
		)
	);
};

// ---------------------------------------------------------------- chord names

const CHORD_NAME =
	/^([A-G])([#b♯♭]?)(maj7|maj9|maj|M7|m7b5|min7|min|m7|m9|m11|m6|m|dim7|dim|°|o|aug|\+|7sus4|sus2|sus4|add9|5|6|7|9|11|13)?(\/[A-G][#b♯♭]?)?$/;

type NamedChord = { name: string; pitchClass: number; quality: Quality };

const qualityForChordSuffix = (suffix: string): Quality => {
	if (/^(dim7?|°|o|m7b5)$/.test(suffix)) return "dim";
	if (/^(aug|\+)$/.test(suffix)) return "aug";
	if (/^(m|min)/.test(suffix) && !suffix.startsWith("maj")) return "min";
	return "maj";
};

const parseChordName = (token: string): NamedChord | null => {
	const match = token.match(CHORD_NAME);
	if (!match) return null;
	const [, letter, accidental, suffix = ""] = match;
	const sign = accidental === "♯" ? "#" : accidental === "♭" ? "b" : accidental;
	return {
		name: token,
		pitchClass: noteNameToPitchClass(`${letter}${sign}`),
		quality: qualityForChordSuffix(suffix)
	};
};

const ACCIDENTAL_NOTE_NAMES = [
	"C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"
];

const romanNumeralFor = (degree: number, quality: Quality): string => {
	const base = ROMAN_DEGREES[degree - 1];
	if (quality === "maj") return base;
	if (quality === "aug") return `${base}+`;
	if (quality === "dim") return `${base.toLowerCase()}°`;
	return base.toLowerCase();
};

// A chord named against a tonic and scale, as a roman numeral: its scale
// degree when its root is in the scale, else the nearest degree flattened
// or sharpened.
const romanFor = (offset: number, quality: Quality, scale: ScaleName): string => {
	const intervals = SCALE_INTERVALS[scale];
	const inScale = intervals.indexOf(offset);
	if (inScale !== -1) return romanNumeralFor(inScale + 1, quality);
	const flatOf = intervals.indexOf((offset + 1) % SEMITONES);
	if (flatOf !== -1) return `b${romanNumeralFor(flatOf + 1, quality)}`;
	const sharpOf = intervals.indexOf((offset + SEMITONES - 1) % SEMITONES);
	return `#${romanNumeralFor(sharpOf + 1, quality)}`;
};

const isDiatonic = (offset: number, quality: Quality, scale: ScaleName) => {
	const degreeIndex = SCALE_INTERVALS[scale].indexOf(offset);
	return (
		degreeIndex !== -1 &&
		diatonicQualityForDegree(scale, degreeIndex + 1) === quality
	);
};

export type KeyedChords = {
	romanTokens: string[];
	keyLabel: string;
	codes: number[];
};

// The key the chords most plausibly sit in (most diatonic chords, then
// ending on the tonic, then starting on it, then major), and the chords as
// roman numerals in it.
export const chordsToRoman = (chords: NamedChord[]): KeyedChords => {
	let best: { tonic: number; scale: ScaleName; score: number } | null = null;
	for (const scale of ["major", "minor"] as const) {
		const tonicQuality: Quality = scale === "major" ? "maj" : "min";
		for (let tonic = 0; tonic < SEMITONES; tonic++) {
			const offsetOf = (chord: NamedChord) =>
				(chord.pitchClass - tonic + SEMITONES) % SEMITONES;
			const isTonic = (chord: NamedChord) =>
				offsetOf(chord) === 0 && chord.quality === tonicQuality;
			const score =
				chords.filter((chord) => isDiatonic(offsetOf(chord), chord.quality, scale))
					.length *
					10 +
				(isTonic(chords[chords.length - 1]) ? 3 : 0) +
				(isTonic(chords[0]) ? 2 : 0);
			if (!best || score > best.score) best = { tonic, scale, score };
		}
	}
	const { tonic, scale } = best!;
	const offsets = chords.map(
		(chord) => (chord.pitchClass - tonic + SEMITONES) % SEMITONES
	);
	return {
		romanTokens: chords.map((chord, index) =>
			romanFor(offsets[index], chord.quality, scale)
		),
		keyLabel: `${ACCIDENTAL_NOTE_NAMES[tonic]} ${scale}`,
		codes: dedupeAdjacent(
			chords.map((chord, index) => codeFor(offsets[index], chord.quality))
		)
	};
};

// ---------------------------------------------------------------- queries

export type ProgressionQuery =
	| { kind: "text" }
	| {
			kind: "roman" | "chords";
			romanTokens: string[];
			// Only for chord names: the key they were read in.
			keyLabel?: string;
			codes: number[];
	  };

const TOKEN_SEPARATORS = /[\s,\-–—→>|]+/;

export const detectQuery = (text: string): ProgressionQuery => {
	const tokens = text.trim().split(TOKEN_SEPARATORS).filter(Boolean);
	if (tokens.length < MIN_PROGRESSION_CHORDS) return { kind: "text" };

	const romans = tokens.map(parseRoman);
	if (romans.every((chord) => chord !== null)) {
		const codes = romanCodes(romans)!;
		return codes.length >= MIN_PROGRESSION_CHORDS
			? { kind: "roman", romanTokens: tokens, codes }
			: { kind: "text" };
	}

	const named = tokens.map(parseChordName);
	if (named.every((chord) => chord !== null)) {
		const keyed = chordsToRoman(named as NamedChord[]);
		return keyed.codes.length >= MIN_PROGRESSION_CHORDS
			? { kind: "chords", ...keyed }
			: { kind: "text" };
	}

	return { kind: "text" };
};

// ---------------------------------------------------------------- progressions

const coreProgressionByName = new Map(
	allProgressionGroups.flatMap((group) =>
		group.progressions.map((progression) => [progression.name, progression])
	)
);

const spellingCodes = (spelling: string, scale?: ScaleName): number[] | null =>
	romanCodes(
		spelling.split("-").map((token) => parseRoman(cleanDataToken(token))),
		scale
	);

const codesByProgressionName = new Map<string, number[][]>();

// Every way a named progression can be matched: each spelling, in its own
// key and shifted to its relative major/minor.
const progressionCodes = (progressionName: string): number[][] => {
	let cached = codesByProgressionName.get(progressionName);
	if (cached) return cached;
	const core = coreProgressionByName.get(progressionName);
	const spellings = core
		? chordProgressionVariants(core.chordProgression).map((spelling) =>
				spellingCodes(spelling, core.scale)
			)
		: [spellingCodes(progressionName)];
	cached = spellings
		.filter((codes): codes is number[] => codes !== null && codes.length > 0)
		.flatMap((codes) =>
			RELATIVE_KEY_SHIFTS.map((shift) =>
				dedupeAdjacent(codes.map((code) => shiftCode(code, shift)))
			)
		);
	codesByProgressionName.set(progressionName, cached);
	return cached;
};

const startsWith = (codes: number[], query: number[]): boolean =>
	query.length <= codes.length && query.every((code, index) => codes[index] === code);

// Contains the query anywhere, wrapping around the end, since a progression
// loops.
const containsLooped = (codes: number[], query: number[]): boolean => {
	if (query.length > codes.length) return false;
	const looped =
		codes.length > 1 && codes[0] === codes[codes.length - 1]
			? codes.slice(0, -1)
			: codes;
	return looped.some((_, start) =>
		query.every((code, index) => looped[(start + index) % looped.length] === code)
	);
};

export const MATCH_STARTS_WITH = 0;
export const MATCH_CONTAINS = 1;

// How well a named progression matches the query's codes: MATCH_STARTS_WITH,
// MATCH_CONTAINS, or null.
export const matchRank = (
	query: number[],
	progressionName: string
): number | null => {
	let rank: number | null = null;
	for (const codes of progressionCodes(progressionName)) {
		if (startsWith(codes, query)) return MATCH_STARTS_WITH;
		if (containsLooped(codes, query)) rank = MATCH_CONTAINS;
	}
	return rank;
};

// A progression name's roman spelling, for display ("I–V–vi–IV").
export const progressionSpelling = (progressionName: string): string =>
	(canonicalChordProgressionByName.get(progressionName) ?? progressionName)
		.split("-")
		.join("–");
