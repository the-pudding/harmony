import type { GroupedSong } from "../../../data/songBrowser.js";
import type { SongCoverageEntry } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
import { decadeOf } from "../history/decadeSignatures.js";
import {
	computeSongHomogeneity,
	HOMOGENEITY_BANDS,
	homogeneityBandFor,
	type HomogeneityBand,
	type HomogeneityBandId,
	type SongHomogeneity
} from "../shared/progressionHomogeneity.js";

const PERCENT_SCALE = 100;
const MIN_DECADE_SONG_COUNT = 20;
export const EXAMPLE_MIN_COVERAGE_PERCENT = 75;
export const DOMINANT_SHARE_BIN_COUNT = 10;

export type SongHomogeneityRow = SongHomogeneity & {
	songKey: string;
	title: string;
	artists: string[];
	year: number | undefined;
	inTop10: boolean;
	coveragePercent: number;
	band: HomogeneityBand;
};

export type HistogramBin = {
	label: string;
	songCount: number;
	sharePercent: number;
};

export type DecadeHomogeneityRow = {
	decade: number;
	songCount: number;
	medianEffectiveCount: number;
	meanEffectiveCount: number;
	meanDistinctCount: number;
	meanDominantSharePercent: number;
	bandSharePercents: Record<HomogeneityBandId, number>;
	mostHomogeneousExample: SongHomogeneityRow | null;
	mostDiverseExample: SongHomogeneityRow | null;
};

export type RecipeProgressionRow = {
	name: string;
	songCount: number;
	sharePercent: number;
	exampleSongs: SongHomogeneityRow[];
};

const sumOf = (values: readonly number[]): number =>
	values.reduce((total, value) => total + value, 0);

const meanOf = (values: readonly number[]): number =>
	values.length === 0 ? 0 : sumOf(values) / values.length;

export const medianOf = (values: readonly number[]): number => {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

const percentOf = (count: number, total: number): number =>
	total === 0 ? 0 : (count / total) * PERCENT_SCALE;

export const buildSongHomogeneityRows = (
	songCoverages: readonly SongCoverageEntry[],
	songByKey: ReadonlyMap<string, GroupedSong>
): SongHomogeneityRow[] =>
	songCoverages.flatMap((entry): SongHomogeneityRow[] => {
		const homogeneity = computeSongHomogeneity(entry.progressionCounts);
		if (!homogeneity) return [];
		const song = songByKey.get(entry.songKey);
		return [
			{
				...homogeneity,
				songKey: entry.songKey,
				title: entry.title,
				artists: entry.artists,
				year: song?.year,
				inTop10: song?.inTop10 ?? false,
				coveragePercent: entry.coveragePercent,
				band: homogeneityBandFor(homogeneity.effectiveProgressionCount)
			}
		];
	});

export const summarizeHomogeneity = (rows: readonly SongHomogeneityRow[]) => {
	const effectiveCounts = rows.map((row) => row.effectiveProgressionCount);
	return {
		songCount: rows.length,
		medianEffectiveCount: medianOf(effectiveCounts),
		meanEffectiveCount: meanOf(effectiveCounts),
		medianDistinctCount: medianOf(rows.map((row) => row.distinctProgressionCount)),
		medianDominantSharePercent: medianOf(rows.map((row) => row.dominantShare)) * PERCENT_SCALE
	};
};

export const buildDominantShareHistogram = (
	rows: readonly SongHomogeneityRow[]
): HistogramBin[] => {
	const binWidthPercent = PERCENT_SCALE / DOMINANT_SHARE_BIN_COUNT;
	const binIndexFor = (dominantShare: number) =>
		Math.min(Math.floor(dominantShare * DOMINANT_SHARE_BIN_COUNT), DOMINANT_SHARE_BIN_COUNT - 1);
	const binIndices = rows.map((row) => binIndexFor(row.dominantShare));
	return Array.from({ length: DOMINANT_SHARE_BIN_COUNT }, (_, binIndex) => {
		const songCount = binIndices.filter((index) => index === binIndex).length;
		const start = binIndex * binWidthPercent;
		return {
			label: `${start}–${start + binWidthPercent}%`,
			songCount,
			sharePercent: percentOf(songCount, rows.length)
		};
	});
};

const exampleRank = (a: SongHomogeneityRow, b: SongHomogeneityRow): number =>
	Number(b.inTop10) - Number(a.inTop10) || b.coveragePercent - a.coveragePercent;

const mostHomogeneousFirst = (a: SongHomogeneityRow, b: SongHomogeneityRow): number =>
	a.effectiveProgressionCount - b.effectiveProgressionCount || exampleRank(a, b);

const mostDiverseFirst = (a: SongHomogeneityRow, b: SongHomogeneityRow): number =>
	b.effectiveProgressionCount - a.effectiveProgressionCount || exampleRank(a, b);

const isExampleEligible = (row: SongHomogeneityRow): boolean =>
	row.coveragePercent >= EXAMPLE_MIN_COVERAGE_PERCENT;

export const pickBandExamples = (
	rows: readonly SongHomogeneityRow[],
	examplesPerBand: number
): { band: HomogeneityBand; songs: SongHomogeneityRow[] }[] =>
	HOMOGENEITY_BANDS.map((band) => ({
		band,
		songs: rows
			.filter((row) => row.band.id === band.id && isExampleEligible(row))
			.sort(exampleRank)
			.slice(0, examplesPerBand)
	}));

export const pickMostDiverseSongs = (
	rows: readonly SongHomogeneityRow[],
	count: number
): SongHomogeneityRow[] =>
	rows
		.filter(isExampleEligible)
		.sort(mostDiverseFirst)
		.slice(0, count);

export const buildRecipeProgressionRows = (
	rows: readonly SongHomogeneityRow[],
	bandId: HomogeneityBandId,
	limit: number,
	examplesPerProgression: number
): RecipeProgressionRow[] => {
	const bandRows = rows.filter((row) => row.band.id === bandId);
	const names = [...new Set(bandRows.map((row) => row.dominantProgressionName))];
	return names
		.map((name) => {
			const songsWithRecipe = bandRows.filter((row) => row.dominantProgressionName === name);
			return {
				name,
				songCount: songsWithRecipe.length,
				sharePercent: percentOf(songsWithRecipe.length, bandRows.length),
				exampleSongs: songsWithRecipe
					.filter(isExampleEligible)
					.sort(exampleRank)
					.slice(0, examplesPerProgression)
			};
		})
		.sort((a, b) => b.songCount - a.songCount || a.name.localeCompare(b.name))
		.slice(0, limit);
};

const bandSharePercentsFor = (
	rows: readonly SongHomogeneityRow[]
): Record<HomogeneityBandId, number> =>
	Object.fromEntries(
		HOMOGENEITY_BANDS.map((band) => [
			band.id,
			percentOf(rows.filter((row) => row.band.id === band.id).length, rows.length)
		])
	) as Record<HomogeneityBandId, number>;

const popularFirstThen =
	(compare: (a: SongHomogeneityRow, b: SongHomogeneityRow) => number) =>
	(a: SongHomogeneityRow, b: SongHomogeneityRow): number =>
		Number(b.inTop10) - Number(a.inTop10) || compare(a, b);

const firstOrNull = <T>(items: readonly T[]): T | null => items[0] ?? null;

export const computeHomogeneityHistory = (
	rows: readonly SongHomogeneityRow[]
): DecadeHomogeneityRow[] => {
	const datedRows = rows.flatMap((row) =>
		row.year === undefined ? [] : [{ row, decade: decadeOf(row.year) }]
	);
	const decades = [...new Set(datedRows.map(({ decade }) => decade))].sort((a, b) => a - b);

	return decades.flatMap((decade): DecadeHomogeneityRow[] => {
		const decadeRows = datedRows.filter((dated) => dated.decade === decade).map(({ row }) => row);
		if (decadeRows.length < MIN_DECADE_SONG_COUNT) return [];
		const eligible = decadeRows.filter(isExampleEligible);
		const effectiveCounts = decadeRows.map((row) => row.effectiveProgressionCount);
		return [
			{
				decade,
				songCount: decadeRows.length,
				medianEffectiveCount: medianOf(effectiveCounts),
				meanEffectiveCount: meanOf(effectiveCounts),
				meanDistinctCount: meanOf(decadeRows.map((row) => row.distinctProgressionCount)),
				meanDominantSharePercent:
					meanOf(decadeRows.map((row) => row.dominantShare)) * PERCENT_SCALE,
				bandSharePercents: bandSharePercentsFor(decadeRows),
				mostHomogeneousExample: firstOrNull(
					[...eligible].sort(popularFirstThen(mostHomogeneousFirst))
				),
				mostDiverseExample: firstOrNull(
					[...eligible].sort(popularFirstThen(mostDiverseFirst))
				)
			}
		];
	});
};
