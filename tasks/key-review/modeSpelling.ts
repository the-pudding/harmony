import {
	NOTES_PER_OCTAVE,
	pitchClass
} from "../../src/chord-processing/chord-classifier/notes.js";
import { SCALE_INTERVALS } from "../../src/chord-processing/scale-intervals.js";

export type DegreeSpelling = { degree: number; accidental: -1 | 0 | 1 };

const MAJOR_INTERVALS = SCALE_INTERVALS.major;
const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];
const ROMAN_HEAD_PATTERN =
	/^([b#]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)/;
const APPLIED_TARGET_PATTERN =
	/\/([b#]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(?![a-z])/;
const ACCIDENTAL_PREFIX: Record<DegreeSpelling["accidental"], string> = {
	[-1]: "b",
	0: "",
	1: "#"
};
const ACCIDENTAL_OFFSET: Record<string, number> = { b: -1, "": 0, "#": 1 };

const scaleIntervalsFor = (scale: string): readonly number[] => {
	const intervals = SCALE_INTERVALS[scale];
	if (!intervals) throw new Error(`Unknown scale "${scale}"`);
	return intervals;
};

const toAccidental = (offset: number): DegreeSpelling["accidental"] => {
	if (offset === -1 || offset === 0 || offset === 1) return offset;
	throw new Error(`Accidental offset ${offset} is out of range`);
};

const signedOffset = (from: number, to: number): number => {
	const up = pitchClass(to - from);
	return up > NOTES_PER_OCTAVE / 2 ? up - NOTES_PER_OCTAVE : up;
};

const parallelMajorDegreeIndex = (intervalFromTonic: number): number => {
	const exactIndex = MAJOR_INTERVALS.indexOf(intervalFromTonic);
	if (exactIndex !== -1) return exactIndex;
	return MAJOR_INTERVALS.indexOf(intervalFromTonic + 1);
};

export const spellIntervalInScale = (
	intervalFromTonic: number,
	scale: string
): DegreeSpelling => {
	const intervals = scaleIntervalsFor(scale);
	const normalized = pitchClass(intervalFromTonic);
	const exactIndex = intervals.indexOf(normalized);
	if (exactIndex !== -1) return { degree: exactIndex + 1, accidental: 0 };

	const degreeIndex = parallelMajorDegreeIndex(normalized);
	return {
		degree: degreeIndex + 1,
		accidental: toAccidental(signedOffset(intervals[degreeIndex], normalized))
	};
};

export const intervalOfSpelling = (
	spelling: DegreeSpelling,
	scale: string
): number =>
	pitchClass(
		scaleIntervalsFor(scale)[spelling.degree - 1] + spelling.accidental
	);

const formatNumeral = (
	spelling: DegreeSpelling,
	lowercase: boolean
): string => {
	const numeral = ROMAN_NUMERALS[spelling.degree - 1];
	return `${ACCIDENTAL_PREFIX[spelling.accidental]}${lowercase ? numeral.toLowerCase() : numeral}`;
};

const isLowercase = (numeral: string): boolean =>
	numeral === numeral.toLowerCase();

const degreeOfNumeral = (numeral: string): number =>
	ROMAN_NUMERALS.indexOf(numeral.toUpperCase()) + 1;

export type RespellContext = {
	rootIntervalFromNewTonic: number;
	fromScale: string;
	toScale: string;
	tonicShift: number;
};

const respellAppliedTarget = (
	tail: string,
	{ fromScale, toScale, tonicShift }: RespellContext
): string =>
	tail.replace(APPLIED_TARGET_PATTERN, (_match, accidental, numeral) => {
		const oldInterval = intervalOfSpelling(
			{
				degree: degreeOfNumeral(numeral),
				accidental: toAccidental(ACCIDENTAL_OFFSET[accidental])
			},
			fromScale
		);
		const spelling = spellIntervalInScale(oldInterval - tonicShift, toScale);
		return `/${formatNumeral(spelling, isLowercase(numeral))}`;
	});

export const respellRomanToken = (
	token: string,
	context: RespellContext
): string => {
	const headMatch = token.match(ROMAN_HEAD_PATTERN);
	if (!headMatch) return token;

	const [head, , numeral] = headMatch;
	const tail = token.slice(head.length);

	if (APPLIED_TARGET_PATTERN.test(tail)) {
		return `${head}${respellAppliedTarget(tail, context)}`;
	}

	const spelling = spellIntervalInScale(
		context.rootIntervalFromNewTonic,
		context.toScale
	);
	return `${formatNumeral(spelling, isLowercase(numeral))}${tail}`;
};
