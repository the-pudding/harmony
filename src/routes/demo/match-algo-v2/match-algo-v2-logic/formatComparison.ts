import { PERCENT_MULTIPLIER } from "./algoMetrics.js";

export const formatPercent = (value: number): string =>
	`${Math.round(value)}%`;

export const formatUnitLength = (value: number): string =>
	value.toFixed(2);

export const formatSharePercent = (share: number): string =>
	formatPercent(share * PERCENT_MULTIPLIER);

export const formatCount = (value: number): string =>
	value.toFixed(1);
