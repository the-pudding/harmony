import {
	BASE_CHORD_SUFFIXES,
	parseRomanToken
} from "../../../../../chord-processing/romanNumerals.js";
import {
	COMPLEXITY_SATURATION_PROGRESSION_COUNT,
	CORE_GROUP_DARKNESS_BLEND,
	DISTINCT_PROGRESSION_COMPLEXITY_WEIGHT,
	EXTENSION_COMPLEXITY_WEIGHT,
	FLAT_DEGREE_DARKNESS_WEIGHT,
	HARMONIC_BREADTH_COMPLEXITY_WEIGHT,
	MAX_HARMONIC_BREADTH_DEGREES,
	MIN_HARMONIC_BREADTH_DEGREES,
	MINOR_QUALITY_DARKNESS_WEIGHT,
	MINOR_SCALE_DARKNESS_WEIGHT
} from "./constants.js";
import { progressionGroupProfileFor } from "./progressionGroups.js";
import type { SongProgressionCounts } from "./progressionVocabulary.js";

export type FeatureAxesCoords = { x: number; y: number };

export type ProgressionFeatures = {
	darkness: number;
	harmonicBreadth: number;
	extensionShare: number;
};

const MINOR_QUALITIES = new Set(["min", "dim"]);

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1);

const toSignedAxis = (value01: number): number => value01 * 2 - 1;

const normalizeRange = (value: number, min: number, max: number): number =>
	clamp01((value - min) / (max - min));

const shareOf = <T>(items: readonly T[], predicate: (item: T) => boolean) =>
	items.length === 0 ? 0 : items.filter(predicate).length / items.length;

export const progressionFeatures = (
	chordProgression: string,
	scale: string
): ProgressionFeatures => {
	const tokens = chordProgression
		.split("-")
		.map(parseRomanToken)
		.filter((token): token is NonNullable<typeof token> => token !== null);

	const scaleDarkness = scale === "major" ? 0 : 1;
	const tokenDarkness =
		scaleDarkness * MINOR_SCALE_DARKNESS_WEIGHT +
		shareOf(tokens, (token) => MINOR_QUALITIES.has(token.quality)) *
			MINOR_QUALITY_DARKNESS_WEIGHT +
		shareOf(tokens, (token) => token.flat) * FLAT_DEGREE_DARKNESS_WEIGHT;

	const groupProfile = progressionGroupProfileFor(chordProgression);
	const darkness =
		groupProfile === null
			? tokenDarkness
			: tokenDarkness * (1 - CORE_GROUP_DARKNESS_BLEND) +
				(1 - groupProfile.brightness) * CORE_GROUP_DARKNESS_BLEND;

	return {
		darkness: clamp01(darkness),
		harmonicBreadth: new Set(
			tokens.map((token) => `${token.flat ? "b" : ""}${token.degree}`)
		).size,
		extensionShare: shareOf(
			tokens,
			(token) => !BASE_CHORD_SUFFIXES.has(token.suffix)
		)
	};
};

type WeightedFeatureTotals = {
	weight: number;
	darkness: number;
	harmonicBreadth: number;
	extensionShare: number;
};

const EMPTY_TOTALS: WeightedFeatureTotals = {
	weight: 0,
	darkness: 0,
	harmonicBreadth: 0,
	extensionShare: 0
};

const weightedTotals = (song: SongProgressionCounts): WeightedFeatureTotals =>
	song.progressionCounts.reduce((totals, count) => {
		const features = progressionFeatures(count.chordProgression, count.scale);
		return {
			weight: totals.weight + count.matchCount,
			darkness: totals.darkness + features.darkness * count.matchCount,
			harmonicBreadth:
				totals.harmonicBreadth + features.harmonicBreadth * count.matchCount,
			extensionShare:
				totals.extensionShare + features.extensionShare * count.matchCount
		};
	}, EMPTY_TOTALS);

export const NEUTRAL_FEATURE_AXES_COORDS: FeatureAxesCoords = { x: 0, y: -1 };

export const computeFeatureAxes = (
	song: SongProgressionCounts
): FeatureAxesCoords => {
	const totals = weightedTotals(song);
	if (totals.weight === 0) return NEUTRAL_FEATURE_AXES_COORDS;

	const distinctProgressionCount = new Set(
		song.progressionCounts.map((count) => count.chordProgression)
	).size;

	const complexity =
		normalizeRange(
			distinctProgressionCount,
			1,
			COMPLEXITY_SATURATION_PROGRESSION_COUNT
		) *
			DISTINCT_PROGRESSION_COMPLEXITY_WEIGHT +
		normalizeRange(
			totals.harmonicBreadth / totals.weight,
			MIN_HARMONIC_BREADTH_DEGREES,
			MAX_HARMONIC_BREADTH_DEGREES
		) *
			HARMONIC_BREADTH_COMPLEXITY_WEIGHT +
		(totals.extensionShare / totals.weight) * EXTENSION_COMPLEXITY_WEIGHT;

	return {
		x: toSignedAxis(1 - totals.darkness / totals.weight),
		y: toSignedAxis(clamp01(complexity))
	};
};

export const buildFeatureAxesCoords = (
	songs: readonly SongProgressionCounts[]
): Map<string, FeatureAxesCoords> =>
	new Map(songs.map((song) => [song.songKey, computeFeatureAxes(song)]));
