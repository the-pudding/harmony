import { rollup, rollups } from "d3";
import { diatonicQualityForDegree } from "../../../../chord-processing/diatonicQuality.js";
import {
	dedupeAdjacentTokens,
	degreeQualityToRoman,
	parseRomanToken
} from "../../../../chord-processing/romanNumerals.js";
import type { ScaleName } from "../../../../chord-processing/scale-intervals.js";
import coreProgressions from "../../../../data/core-progressions.js";
import { toneOfRomanToken, type ChordTone } from "./diatonicChords.js";

type ProgressionMatch = {
	name: string;
	chordProgression: string;
	scale: ScaleName;
	isCore: boolean;
};

type SongMatches = {
	progressionCounts: readonly ProgressionMatch[];
};

export type ProgressionToken = { roman: string; tone: ChordTone };

export type ProgressionVariant = {
	spelling: string;
	tokens: ProgressionToken[];
	songCount: number;
};

export type TopProgression = {
	name: string;
	label: string;
	variants: ProgressionVariant[];
	scale: ScaleName;
	songCount: number;
};

export type ProgressionFilters = {
	requiresMinorChord: boolean;
	requiresMinorKey: boolean;
};

export const DEFAULT_PROGRESSION_FILTERS: ProgressionFilters = {
	requiresMinorChord: false,
	requiresMinorKey: false
};

export const TOP_PROGRESSIONS_LIMIT = 5;
const PROGRESSION_SEPARATOR = "-";

export const ROW_CHORD_RADIUS = 18;
const ROW_CHORD_SPACING = 0.85;
const ROW_PADDING = 6;
const ROW_CHORD_STEP = 2 * ROW_CHORD_RADIUS * ROW_CHORD_SPACING;
export const ROW_HEIGHT = 2 * (ROW_CHORD_RADIUS + ROW_PADDING);
export const ROW_CENTER_Y = ROW_HEIGHT / 2;

export const rowChordCenterX = (index: number): number =>
	ROW_PADDING + ROW_CHORD_RADIUS + index * ROW_CHORD_STEP;

export const rowWidthFor = (chordCount: number): number =>
	rowChordCenterX(chordCount - 1) + ROW_CHORD_RADIUS + ROW_PADDING;

const TONIC_DEGREE = 1;
const MINOR_TONIC_QUALITIES = new Set(["min", "dim"]);

const coreByName = new Map(
	coreProgressions.map((progression) => [progression.name, progression])
);

export const progressionTokensOf = (
	chordProgression: string
): ProgressionToken[] =>
	chordProgression.split(PROGRESSION_SEPARATOR).map((roman) => ({
		roman,
		tone: toneOfRomanToken(roman)
	}));

export const simplifyRomanToken = (token: string): string => {
	const parsed = parseRomanToken(token);
	const roman = parsed && degreeQualityToRoman(parsed.degree, parsed.quality);
	if (!parsed || !roman) return token;
	return `${parsed.flat ? "b" : ""}${parsed.sharp ? "#" : ""}${roman}`;
};

export const simplifySpelling = (chordProgression: string): string =>
	dedupeAdjacentTokens(
		chordProgression.split(PROGRESSION_SEPARATOR).map(simplifyRomanToken)
	).join(PROGRESSION_SEPARATOR);

const uniqueBy = (
	matches: readonly ProgressionMatch[],
	keyOf: (match: ProgressionMatch) => string
): ProgressionMatch[] => [
	...new Map(matches.map((match) => [keyOf(match), match])).values()
];

const nameOf = (match: ProgressionMatch): string => match.name;

const variantKeyOf = (match: ProgressionMatch): string =>
	`${match.name}|${simplifySpelling(match.chordProgression)}`;

const coreDefinitionOf = (match: ProgressionMatch) =>
	match.isCore ? coreByName.get(match.name) : undefined;

const authoredSpellingsOf = (match: ProgressionMatch): string[] => {
	const core = coreDefinitionOf(match);
	return core ? [core.chordProgression].flat() : [match.chordProgression];
};

const scaleOf = (match: ProgressionMatch): ScaleName =>
	coreDefinitionOf(match)?.scale ?? match.scale;

export const isMinorKey = (scale: ScaleName): boolean =>
	MINOR_TONIC_QUALITIES.has(diatonicQualityForDegree(scale, TONIC_DEGREE));

const hasMinorChord = (progression: TopProgression): boolean =>
	progression.variants.some((variant) =>
		variant.tokens.some((token) => token.tone === "minor")
	);

const variantsOf = (
	match: ProgressionMatch,
	totalSongCount: number,
	songCountBySpelling: ReadonlyMap<string, number> | undefined
): ProgressionVariant[] => {
	const spellings = authoredSpellingsOf(match);
	const countFor = (spelling: string): number =>
		spellings.length === 1
			? totalSongCount
			: (songCountBySpelling?.get(simplifySpelling(spelling)) ?? 0);
	const variants = spellings
		.map((spelling) => ({
			spelling,
			tokens: progressionTokensOf(spelling),
			songCount: countFor(spelling)
		}))
		.sort((a, b) => b.songCount - a.songCount);
	const matchedVariants = variants.filter(({ songCount }) => songCount > 0);
	return matchedVariants.length > 0 ? matchedVariants : variants.slice(0, 1);
};

export const rankProgressions = (
	songs: readonly SongMatches[]
): TopProgression[] => {
	const variantCounts = rollup(
		songs.flatMap((song) => uniqueBy(song.progressionCounts, variantKeyOf)),
		(matches) => matches.length,
		nameOf,
		(match) => simplifySpelling(match.chordProgression)
	);
	return rollups(
		songs.flatMap((song) => uniqueBy(song.progressionCounts, nameOf)),
		(matches) => ({ match: matches[0], songCount: matches.length }),
		nameOf
	)
		.map(([name, { match, songCount }]) => ({
			name,
			label: match.isCore ? name : match.chordProgression,
			variants: variantsOf(match, songCount, variantCounts.get(name)),
			scale: scaleOf(match),
			songCount
		}))
		.sort(
			(a, b) => b.songCount - a.songCount || a.label.localeCompare(b.label)
		);
};

const matchesFilters =
	(filters: ProgressionFilters) =>
	(progression: TopProgression): boolean =>
		(!filters.requiresMinorChord || hasMinorChord(progression)) &&
		(!filters.requiresMinorKey || isMinorKey(progression.scale));

export const selectTopProgressions = (
	ranked: readonly TopProgression[],
	filters: ProgressionFilters,
	limit: number = TOP_PROGRESSIONS_LIMIT
): TopProgression[] => ranked.filter(matchesFilters(filters)).slice(0, limit);
