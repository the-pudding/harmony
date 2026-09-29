import { formatEffectiveProgressionCount } from "../shared/progressionHomogeneity.js";

const PERCENT_SCALE = 100;

export const formatEffectiveCount = formatEffectiveProgressionCount;

export const shareToPercent = (share: number): number => share * PERCENT_SCALE;

export const formatShareAsPercent = (share: number): string =>
	`${Math.round(shareToPercent(share))}%`;

export const formatPercent = (percent: number): string => `${Math.round(percent)}%`;
