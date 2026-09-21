export type YearScrubRange = {
	min: number;
	max: number;
};

export const shiftYearRangeWithinBounds = (
	range: YearScrubRange,
	deltaYears: number,
	bounds: YearScrubRange
): YearScrubRange => {
	const span = range.max - range.min;
	const maxStart = bounds.max - span;
	const nextMin = Math.min(Math.max(range.min + deltaYears, bounds.min), maxStart);
	return { min: nextMin, max: nextMin + span };
};

export const yearDeltaFromPointerMove = (
	pointerDeltaPx: number,
	trackWidthPx: number,
	bounds: YearScrubRange
): number => {
	if (trackWidthPx <= 0) return 0;
	const yearSpan = bounds.max - bounds.min;
	if (yearSpan <= 0) return 0;
	return Math.round((pointerDeltaPx / trackWidthPx) * yearSpan);
};
