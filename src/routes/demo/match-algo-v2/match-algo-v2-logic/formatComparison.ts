import { PERCENT_MULTIPLIER } from "./algoMetrics.js";
import type { AxisVerdict } from "./compareCorpus.js";

const SIGNED_DECIMAL_PLACES = 1;
const UNIT_LENGTH_DECIMAL_PLACES = 2;
const TENTHS = 10;

export const formatPercent = (value: number): string =>
	`${Math.round(value)}%`;

export const formatSignedPercentPoints = (value: number): string => {
	const rounded = Math.round(value * TENTHS) / TENTHS;
	const sign = rounded > 0 ? "+" : "";
	return `${sign}${rounded.toFixed(SIGNED_DECIMAL_PLACES)} pp`;
};

export const formatUnitLength = (value: number): string =>
	value.toFixed(UNIT_LENGTH_DECIMAL_PLACES);

export const formatSignedUnitLength = (value: number): string => {
	const rounded = Math.round(value * TENTHS) / TENTHS;
	const sign = rounded > 0 ? "+" : "";
	return `${sign}${rounded.toFixed(SIGNED_DECIMAL_PLACES)}`;
};

export const formatSharePercent = (share: number): string =>
	formatPercent(share * PERCENT_MULTIPLIER);

export const formatSignedSharePercentPoints = (shareDelta: number): string =>
	formatSignedPercentPoints(shareDelta * PERCENT_MULTIPLIER);

export const formatCount = (value: number): string =>
	value.toFixed(SIGNED_DECIMAL_PLACES);

export const formatSignedInteger = (value: number): string => {
	const sign = value > 0 ? "+" : "";
	return `${sign}${value}`;
};

export const verdictLabel = (verdict: AxisVerdict): string => {
	if (verdict === "better") return "v2 better";
	if (verdict === "worse") return "v2 worse";
	return "similar";
};
