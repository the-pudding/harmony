import { interpolateHcl, rgb } from "d3";
import type { SongProgressionCount } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";

export type ProgressionShare = {
	name: string;
	share: number;
};

export type SongHomogeneity = {
	progressionShares: ProgressionShare[];
	distinctProgressionCount: number;
	dominantProgressionName: string;
	dominantShare: number;
	homogeneity: number;
	effectiveProgressionCount: number;
};

export type HomogeneityBandId = "single" | "pair" | "trio" | "several" | "many";

export type HomogeneityBand = {
	id: HomogeneityBandId;
	label: string;
	shortLabel: string;
	color: string;
	upperBound: number;
};

const SIMPLE_COLOR = "#d4d4d8";
const COMPLEX_COLOR = "#8b5cf6";

const BAND_DEFINITIONS: readonly Omit<HomogeneityBand, "color">[] = [
	{ id: "single", label: "≈1 progression", shortLabel: "≈1", upperBound: 1.5 },
	{ id: "pair", label: "≈2 progressions", shortLabel: "≈2", upperBound: 2.5 },
	{ id: "trio", label: "≈3 progressions", shortLabel: "≈3", upperBound: 3.5 },
	{ id: "several", label: "4–5 progressions", shortLabel: "4–5", upperBound: 5.5 },
	{
		id: "many",
		label: "6+ progressions",
		shortLabel: "6+",
		upperBound: Number.POSITIVE_INFINITY
	}
];

const interpolateSimpleToComplex = interpolateHcl(SIMPLE_COLOR, COMPLEX_COLOR);

export const HOMOGENEITY_BANDS: readonly HomogeneityBand[] = BAND_DEFINITIONS.map(
	(band, index) => ({
		...band,
		color: rgb(interpolateSimpleToComplex(index / (BAND_DEFINITIONS.length - 1))).formatHex()
	})
);

export const MOST_HOMOGENEOUS_BAND = HOMOGENEITY_BANDS[0];
export const MOST_DIVERSE_BAND = HOMOGENEITY_BANDS[HOMOGENEITY_BANDS.length - 1];

export const HOMOGENEITY_MEASURE_NAME = "effective progressions";

export const HOMOGENEITY_MEASURE_EXPLANATION =
	"Effective progressions = 1 / Σ share², where each share is a matched progression's fraction of the song's matched chords (core and gap-fill alike; unmatched chords are ignored). It reads as \"this song behaves like N equally-used progressions\": a song that's one loop start to finish scores 1, two progressions split 50/50 score 2, and a 90/10 split scores ≈1.2 — a brief bridge barely moves it.";

const sumOf = (values: readonly number[]): number =>
	values.reduce((total, value) => total + value, 0);

const coverageByProgressionName = (
	progressionCounts: readonly SongProgressionCount[]
): Map<string, number> =>
	progressionCounts.reduce(
		(totals, count) =>
			new Map(totals).set(count.name, (totals.get(count.name) ?? 0) + count.coveragePercent),
		new Map<string, number>()
	);

const simpsonConcentration = (shares: readonly number[]): number =>
	sumOf(shares.map((share) => share * share));

export const effectiveCountForShares = (shares: readonly number[]): number =>
	1 / simpsonConcentration(shares);

export const computeSongHomogeneity = (
	progressionCounts: readonly SongProgressionCount[]
): SongHomogeneity | null => {
	const coverageByName = [...coverageByProgressionName(progressionCounts)].filter(
		([, coverage]) => coverage > 0
	);
	const totalCoverage = sumOf(coverageByName.map(([, coverage]) => coverage));
	if (totalCoverage === 0) return null;

	const progressionShares = coverageByName
		.map(([name, coverage]) => ({ name, share: coverage / totalCoverage }))
		.sort((a, b) => b.share - a.share || a.name.localeCompare(b.name));
	const homogeneity = simpsonConcentration(
		progressionShares.map(({ share }) => share)
	);

	return {
		progressionShares,
		distinctProgressionCount: progressionShares.length,
		dominantProgressionName: progressionShares[0].name,
		dominantShare: progressionShares[0].share,
		homogeneity,
		effectiveProgressionCount: 1 / homogeneity
	};
};

export const effectiveProgressionCountFor = (
	progressionCounts: readonly SongProgressionCount[]
): number | null => computeSongHomogeneity(progressionCounts)?.effectiveProgressionCount ?? null;

export const homogeneityBandFor = (effectiveProgressionCount: number): HomogeneityBand =>
	HOMOGENEITY_BANDS.find((band) => effectiveProgressionCount < band.upperBound) ??
	MOST_DIVERSE_BAND;

export type HomogeneityBandShare = {
	band: HomogeneityBand;
	songCount: number;
	sharePercent: number;
};

const PERCENT_SCALE = 100;

export const buildHomogeneityBandShares = (
	effectiveProgressionCounts: readonly number[]
): HomogeneityBandShare[] => {
	const bandIds = effectiveProgressionCounts.map((count) => homogeneityBandFor(count).id);
	return HOMOGENEITY_BANDS.map((band) => {
		const songCount = bandIds.filter((id) => id === band.id).length;
		return {
			band,
			songCount,
			sharePercent:
				bandIds.length === 0 ? 0 : (songCount / bandIds.length) * PERCENT_SCALE
		};
	});
};
