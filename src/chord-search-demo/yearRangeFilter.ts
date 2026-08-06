export type YearRangeFilter = readonly [minYear: number, maxYear: number];

export const toPlainYearRange = (
	yearRange: YearRangeFilter | null
): YearRangeFilter | null => {
	if (!yearRange) return null;

	const [minYear, maxYear] = yearRange;
	return [minYear, maxYear];
};

export const matchesYearRange = (
	year: number | undefined,
	yearRange: YearRangeFilter | null | undefined
): boolean => {
	if (yearRange == null) return true;
	if (year === undefined) return false;

	const [minYear, maxYear] = yearRange;
	return year >= minYear && year < maxYear + 1;
};
