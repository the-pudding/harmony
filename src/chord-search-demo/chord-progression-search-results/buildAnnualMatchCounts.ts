import type { GroupedSongSearchResult } from "../../chord-processing/types.js";
import { toCalendarYear } from "../../data/songYear.js";

export type AnnualMatchCount = {
	year: number;
	count: number;
};

export const buildAnnualMatchCounts = (
	results: GroupedSongSearchResult[]
): AnnualMatchCount[] => {
	const countsByYear = new Map<number, number>();

	for (const result of results) {
		const { year } = result;
		if (year === undefined) continue;
		const calendarYear = toCalendarYear(year);
		countsByYear.set(calendarYear, (countsByYear.get(calendarYear) ?? 0) + 1);
	}

	if (countsByYear.size === 0) return [];

	const years = [...countsByYear.keys()];
	const minYear = Math.min(...years);
	const maxYear = Math.max(...years);
	const yearSpan = maxYear - minYear + 1;

	return Array.from({ length: yearSpan }, (_, index) => {
		const year = minYear + index;
		return { year, count: countsByYear.get(year) ?? 0 };
	});
};
