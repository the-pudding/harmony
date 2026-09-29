const EFFECTIVE_COUNT_DECIMAL_PLACES = 1;
const PERCENT_SCALE = 100;

export const formatEffectiveCount = (value: number): string =>
	value.toFixed(EFFECTIVE_COUNT_DECIMAL_PLACES);

export const shareToPercent = (share: number): number => share * PERCENT_SCALE;

export const formatShareAsPercent = (share: number): string =>
	`${Math.round(shareToPercent(share))}%`;

export const formatPercent = (percent: number): string => `${Math.round(percent)}%`;
