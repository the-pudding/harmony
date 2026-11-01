import {
	percentChange,
	type ChangedRow,
	type HeadlineMetric,
	type SongChangeExample
} from "./matchingChangeReport.js";

export type RowVariant = "core" | "cluster";

const PERCENT_FRACTION_DIGITS = 1;
const NEW_LABEL = "new";
const REMOVED_LABEL = "removed";
const NO_PROGRESSION_LABEL = "none";
const ARROW = "→";
const POSITIVE_SIGN = "+";
const NO_CHANGE = 0;
const PERCENTAGE_POINTS_SUFFIX = " pp";

const withSign = (value: number, formatted: string) =>
	value > NO_CHANGE ? `${POSITIVE_SIGN}${formatted}` : formatted;

export const formatPercent = (value: number): string =>
	`${value.toFixed(PERCENT_FRACTION_DIGITS)}%`;

export const formatSignedPercent = (value: number): string =>
	withSign(value, formatPercent(value));

export const formatSignedCount = (value: number): string =>
	withSign(value, value.toLocaleString());

export const formatSignedPercentagePoints = (value: number): string =>
	withSign(
		value,
		`${value.toFixed(PERCENT_FRACTION_DIGITS)}${PERCENTAGE_POINTS_SUFFIX}`
	);

export const formatMetricValue = (
	value: number,
	unit: HeadlineMetric["unit"]
): string =>
	unit === "percent" ? formatPercent(value) : value.toLocaleString();

export const formatMetricDelta = (metric: HeadlineMetric): string => {
	const delta = metric.after - metric.before;
	return metric.unit === "percent"
		? formatSignedPercentagePoints(delta)
		: formatSignedCount(delta);
};

export const formatPercentChangeLabel = (
	before: number,
	after: number
): string => {
	const change = percentChange(before, after);
	return change === null ? NEW_LABEL : formatSignedPercent(change);
};

export const formatRowChangeLabel = (
	row: ChangedRow,
	variant: RowVariant
): string =>
	variant === "cluster" && row.after === NO_CHANGE
		? REMOVED_LABEL
		: formatPercentChangeLabel(row.before, row.after);

export const formatRowDelta = (row: ChangedRow): string =>
	formatSignedCount(row.after - row.before);

export const rowDeltaDirection = (row: ChangedRow): "up" | "down" | "flat" => {
	const delta = row.after - row.before;
	return delta > NO_CHANGE ? "up" : delta < NO_CHANGE ? "down" : "flat";
};

export const formatSongTitle = (example: SongChangeExample): string =>
	[example.title, example.artists.join(", ")]
		.filter((part) => part.length > 0)
		.join(" — ");

export const formatCoverageChange = (example: SongChangeExample): string =>
	`${Math.round(example.beforePercent)}% ${ARROW} ${Math.round(example.afterPercent)}%`;

export const formatMainProgressionChange = (
	example: SongChangeExample
): string =>
	`main: ${example.dominantBefore ?? NO_PROGRESSION_LABEL} ${ARROW} ${example.dominantAfter ?? NO_PROGRESSION_LABEL}`;

export const formatBeforeAfter = (row: ChangedRow): string =>
	`${row.before.toLocaleString()} ${ARROW} ${row.after.toLocaleString()}`;

const dominantChanged = (example: SongChangeExample): boolean =>
	example.dominantAfter !== example.dominantBefore;

export const exampleDetails = (
	example: SongChangeExample,
	variant: RowVariant
): string[] =>
	variant === "cluster"
		? [formatMainProgressionChange(example)]
		: [
				formatCoverageChange(example),
				...(dominantChanged(example)
					? [formatMainProgressionChange(example)]
					: [])
			];
