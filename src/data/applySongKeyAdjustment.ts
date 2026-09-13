import {
	NOTES_PER_OCTAVE,
	noteNameToPitchClass
} from "../chord-processing/chord-classifier/notes.js";
import {
	formatParsedRomanToken,
	parseRomanToken,
	type ParsedRomanToken
} from "../chord-processing/romanNumerals.js";
import {
	SCALE_INTERVALS,
	romanTokensToProgressionInKey
} from "../chord-processing/scales.js";
import type { SongInput } from "../chord-processing/types.js";
import type { SongKeyAdjustment } from "./hand-corrected-songs.js";

const SCALE_DEGREE_COUNT = 7;

type DegreeSpelling = {
	degree: number;
	flat: boolean;
	sharp: boolean;
};

const absolutePitchClassFromSpelling = (
	spelling: DegreeSpelling,
	key: string,
	scale: string
): number => {
	const intervals = SCALE_INTERVALS[scale];
	if (!intervals) throw new Error(`Unknown scale "${scale}"`);

	const tonic = noteNameToPitchClass(key);
	const scaleOffset = intervals[spelling.degree - 1];
	if (scaleOffset === undefined) {
		throw new Error(
			`Degree ${spelling.degree} out of range for scale "${scale}"`
		);
	}

	return (
		(tonic +
			scaleOffset +
			(spelling.sharp ? 1 : 0) -
			(spelling.flat ? 1 : 0) +
			NOTES_PER_OCTAVE * 2) %
		NOTES_PER_OCTAVE
	);
};

const spellingForPitchClassInKey = (
	pitchClass: number,
	key: string,
	scale: string
): DegreeSpelling => {
	const intervals = SCALE_INTERVALS[scale];
	if (!intervals) throw new Error(`Unknown scale "${scale}"`);

	const relative =
		(pitchClass - noteNameToPitchClass(key) + NOTES_PER_OCTAVE) %
		NOTES_PER_OCTAVE;

	const exactDegree = intervals.indexOf(relative);
	if (exactDegree !== -1) {
		return { degree: exactDegree + 1, flat: false, sharp: false };
	}

	for (let degreeIndex = 0; degreeIndex < SCALE_DEGREE_COUNT; degreeIndex++) {
		if (
			(intervals[degreeIndex] - 1 + NOTES_PER_OCTAVE) % NOTES_PER_OCTAVE ===
			relative
		) {
			return { degree: degreeIndex + 1, flat: true, sharp: false };
		}
	}

	for (let degreeIndex = 0; degreeIndex < SCALE_DEGREE_COUNT; degreeIndex++) {
		if ((intervals[degreeIndex] + 1) % NOTES_PER_OCTAVE === relative) {
			return { degree: degreeIndex + 1, flat: false, sharp: true };
		}
	}

	throw new Error(
		`Cannot express pitch class ${pitchClass} in ${key} ${scale}`
	);
};

const reinterpretParsedTokenForKey = (
	parsed: ParsedRomanToken,
	fromKey: string,
	toKey: string,
	scale: string
): ParsedRomanToken => {
	const rootSpelling = spellingForPitchClassInKey(
		absolutePitchClassFromSpelling(
			{
				degree: parsed.degree,
				flat: parsed.flat,
				sharp: parsed.sharp
			},
			fromKey,
			scale
		),
		toKey,
		scale
	);

	if (parsed.bassDegree === undefined) {
		return {
			...parsed,
			degree: rootSpelling.degree,
			flat: rootSpelling.flat,
			sharp: rootSpelling.sharp
		};
	}

	const bassSpelling = spellingForPitchClassInKey(
		absolutePitchClassFromSpelling(
			{
				degree: parsed.bassDegree,
				flat: parsed.bassFlat ?? false,
				sharp: parsed.bassSharp ?? false
			},
			fromKey,
			scale
		),
		toKey,
		scale
	);

	return {
		...parsed,
		degree: rootSpelling.degree,
		flat: rootSpelling.flat,
		sharp: rootSpelling.sharp,
		bassDegree: bassSpelling.degree,
		bassFlat: bassSpelling.flat,
		bassSharp: bassSpelling.sharp
	};
};

const NON_ROMAN_SLASH_TAIL_PATTERN = /\/(?![b#]?[ivIV]+)/;

export const reinterpretRomanTokensForKey = (
	tokens: string[],
	fromKey: string,
	toKey: string,
	scale: string
): string[] =>
	tokens.map((token) => {
		const slashTailMatch = token.match(NON_ROMAN_SLASH_TAIL_PATTERN);
		const slashTail = slashTailMatch ? token.slice(slashTailMatch.index) : "";
		const head = slashTail ? token.slice(0, slashTailMatch!.index) : token;

		const parsed = parseRomanToken(head);
		if (!parsed) {
			throw new Error(`Cannot parse roman token "${token}" for key adjustment`);
		}

		return `${formatParsedRomanToken(
			reinterpretParsedTokenForKey(parsed, fromKey, toKey, scale)
		)}${slashTail}`;
	});

export const applySongKeyAdjustment = (
	song: SongInput,
	adjustment: SongKeyAdjustment
): SongInput => {
	const fromKey = song.key;
	if (!fromKey) {
		throw new Error(
			`Cannot apply key adjustment to "${song.songKey ?? song.id}": missing key`
		);
	}

	const scale = adjustment.scale ?? song.scale;
	if (!scale) {
		throw new Error(
			`Cannot apply key adjustment to "${song.songKey ?? song.id}": missing scale`
		);
	}

	const tokens = song.romanTokens;
	if (!tokens || tokens.length === 0) {
		throw new Error(
			`Cannot apply key adjustment to "${song.songKey ?? song.id}": missing romanTokens`
		);
	}

	const correctedRomans = reinterpretRomanTokensForKey(
		tokens,
		fromKey,
		adjustment.chordsRelativeToKey,
		scale
	);
	const finalKey = adjustment.transposeToKey ?? adjustment.chordsRelativeToKey;
	const progression = romanTokensToProgressionInKey(
		correctedRomans,
		finalKey,
		scale
	);

	const {
		suffixes: _suffixes,
		deltas: _deltas,
		bassIntervals: _bassIntervals,
		wrapDelta: _wrapDelta,
		...rest
	} = song;

	return {
		...rest,
		key: finalKey,
		scale,
		romanTokens: correctedRomans,
		progression
	};
};
