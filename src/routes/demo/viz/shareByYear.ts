export type YearSharePoint = {
	year: number;
	matchedCount: number;
	totalCount: number;
	sharePercent: number;
};

// Aggregates a flat list of dated, matched-or-not items into one point per
// year — the share (0-100) of that year's items where matched is true.
export const computeShareByYear = (
	items: readonly { year: number; matched: boolean }[]
): YearSharePoint[] => {
	const totals = new Map<number, number>();
	const matched = new Map<number, number>();
	for (const item of items) {
		totals.set(item.year, (totals.get(item.year) ?? 0) + 1);
		if (item.matched) {
			matched.set(item.year, (matched.get(item.year) ?? 0) + 1);
		}
	}
	const years = [...totals.keys()].sort((a, b) => a - b);
	return years.map((year) => {
		const totalCount = totals.get(year) ?? 0;
		const matchedCount = matched.get(year) ?? 0;
		return {
			year,
			totalCount,
			matchedCount,
			sharePercent: totalCount > 0 ? (matchedCount / totalCount) * 100 : 0
		};
	});
};
