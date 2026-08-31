import type { GroupedSong } from "../../../../../data/songBrowser.js";

export const NEUTRAL_YEAR_AXIS_VALUE = 0.5;
export const DECADE_YEAR_STEP = 10;

export type YearAxisExtent = {
	minYear: number;
	maxYear: number;
};

export type DecadeAxisTick = {
	decade: number;
	label: string;
	axisValue: number;
};

export const buildYearAxisExtent = (
	songs: readonly GroupedSong[]
): YearAxisExtent | null => {
	const years = songs.flatMap((song) =>
		song.year === undefined ? [] : [song.year]
	);
	if (years.length === 0) return null;
	return {
		minYear: Math.min(...years),
		maxYear: Math.max(...years)
	};
};

export const yearToAxisValue = (
	year: number,
	extent: YearAxisExtent
): number =>
	extent.maxYear === extent.minYear
		? NEUTRAL_YEAR_AXIS_VALUE
		: (year - extent.minYear) / (extent.maxYear - extent.minYear);

export const axisValueToSceneZ = (
	axisValue: number,
	sceneScale: number
): number => (axisValue - 0.5) * sceneScale;

export const buildYearAxisBySongKey = (
	songs: readonly GroupedSong[]
): Map<string, number> => {
	const extent = buildYearAxisExtent(songs);
	if (extent === null) {
		return new Map(songs.map((song) => [song.songKey, NEUTRAL_YEAR_AXIS_VALUE]));
	}

	return new Map(
		songs.map((song) => [
			song.songKey,
			song.year === undefined
				? NEUTRAL_YEAR_AXIS_VALUE
				: yearToAxisValue(song.year, extent)
		])
	);
};

export const buildDecadeAxisTicks = (
	extent: YearAxisExtent
): DecadeAxisTick[] => {
	const firstDecade =
		Math.floor(extent.minYear / DECADE_YEAR_STEP) * DECADE_YEAR_STEP;
	const lastDecade =
		Math.floor(extent.maxYear / DECADE_YEAR_STEP) * DECADE_YEAR_STEP;
	const ticks: DecadeAxisTick[] = [];

	for (let decade = firstDecade; decade <= lastDecade; decade += DECADE_YEAR_STEP) {
		ticks.push({
			decade,
			label: `${decade}s`,
			axisValue: yearToAxisValue(decade, extent)
		});
	}

	return ticks;
};
