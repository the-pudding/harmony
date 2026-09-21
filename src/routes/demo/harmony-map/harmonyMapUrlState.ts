import { replaceState } from "$app/navigation";
import { page } from "$app/state";
import {
	isEmbeddingMethod,
	type EmbeddingMethod
} from "./embedding/reducers/types.js";
import {
	DEFAULT_BLEND_WEIGHTS,
	type BlendWeights
} from "./embedding/vectors/constants.js";
import {
	DEFAULT_MAP_VIEW_MODE,
	MAP_VIEW_MODE_TO_URL,
	mapViewModeFromUrl,
	type MapViewMode
} from "./viewMode.js";

export const HARMONY_MAP_URL_PARAM_METHOD = "method";
export const HARMONY_MAP_URL_PARAM_VIEW = "view";
export const HARMONY_MAP_URL_PARAM_BLEND = "bw";
export const HARMONY_MAP_URL_PARAM_YEAR_MIN = "ymin";
export const HARMONY_MAP_URL_PARAM_YEAR_MAX = "ymax";

export const DEFAULT_EMBEDDING_METHOD: EmbeddingMethod = "umap";

export type YearScrubRange = {
	min: number;
	max: number;
};

export type HarmonyMapUrlState = {
	method: EmbeddingMethod;
	view: MapViewMode;
	blendWeights: BlendWeights;
	yearRange: YearScrubRange | null;
};

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max);

const parseBlendWeights = (raw: string): BlendWeights => {
	const parts = raw.split(",").map(Number);
	const [identity, content, groupShare, axes, groupPull] = parts;
	return {
		identity: isFinite(identity ?? NaN)
			? clamp(identity!, 0, 4)
			: DEFAULT_BLEND_WEIGHTS.identity,
		content: isFinite(content ?? NaN)
			? clamp(content!, 0, 4)
			: DEFAULT_BLEND_WEIGHTS.content,
		groupShare: isFinite(groupShare ?? NaN)
			? clamp(groupShare!, 0, 4)
			: DEFAULT_BLEND_WEIGHTS.groupShare,
		axes: isFinite(axes ?? NaN)
			? clamp(axes!, 0, 4)
			: DEFAULT_BLEND_WEIGHTS.axes,
		groupPull: isFinite(groupPull ?? NaN)
			? clamp(groupPull!, 0, 1)
			: DEFAULT_BLEND_WEIGHTS.groupPull
	};
};

const encodeBlendWeights = (weights: BlendWeights): string =>
	[
		weights.identity,
		weights.content,
		weights.groupShare,
		weights.axes,
		weights.groupPull
	]
		.map((v) => v.toFixed(2))
		.join(",");

const blendWeightsAreDefault = (weights: BlendWeights): boolean =>
	JSON.stringify(weights) === JSON.stringify(DEFAULT_BLEND_WEIGHTS);

const parseCalendarYear = (raw: string | null): number | null => {
	if (raw === null || raw === "") return null;
	const year = Number(raw);
	if (!Number.isInteger(year)) return null;
	return year;
};

const parseYearRange = (searchParams: URLSearchParams): YearScrubRange | null => {
	const min = parseCalendarYear(searchParams.get(HARMONY_MAP_URL_PARAM_YEAR_MIN));
	const max = parseCalendarYear(searchParams.get(HARMONY_MAP_URL_PARAM_YEAR_MAX));
	if (min === null || max === null) return null;
	if (min > max) return { min: max, max: min };
	return { min, max };
};

const yearRangesEqual = (
	first: YearScrubRange | null,
	second: YearScrubRange | null
): boolean => {
	if (first === null || second === null) return first === second;
	return first.min === second.min && first.max === second.max;
};

export const clampYearScrubRange = (
	range: YearScrubRange,
	bounds: YearScrubRange
): YearScrubRange => {
	const min = clamp(range.min, bounds.min, bounds.max);
	const max = clamp(range.max, bounds.min, bounds.max);
	return min <= max ? { min, max } : { min: max, max: min };
};

export const isFullYearScrubRange = (
	range: YearScrubRange,
	bounds: YearScrubRange
): boolean => range.min <= bounds.min && range.max >= bounds.max;

export const readHarmonyMapUrlState = (
	searchParams: URLSearchParams
): HarmonyMapUrlState => {
	const method = searchParams.get(HARMONY_MAP_URL_PARAM_METHOD) ?? "";
	const view = searchParams.get(HARMONY_MAP_URL_PARAM_VIEW) ?? "";
	const bw = searchParams.get(HARMONY_MAP_URL_PARAM_BLEND);
	return {
		method: isEmbeddingMethod(method) ? method : DEFAULT_EMBEDDING_METHOD,
		view: mapViewModeFromUrl(view) ?? DEFAULT_MAP_VIEW_MODE,
		blendWeights: bw ? parseBlendWeights(bw) : DEFAULT_BLEND_WEIGHTS,
		yearRange: parseYearRange(searchParams)
	};
};

export const writeHarmonyMapUrlState = (
	params: URLSearchParams,
	state: HarmonyMapUrlState
): void => {
	if (state.method === DEFAULT_EMBEDDING_METHOD) {
		params.delete(HARMONY_MAP_URL_PARAM_METHOD);
	} else {
		params.set(HARMONY_MAP_URL_PARAM_METHOD, state.method);
	}

	if (state.view === DEFAULT_MAP_VIEW_MODE) {
		params.delete(HARMONY_MAP_URL_PARAM_VIEW);
	} else {
		params.set(HARMONY_MAP_URL_PARAM_VIEW, MAP_VIEW_MODE_TO_URL[state.view]);
	}

	if (state.method === "blend" && !blendWeightsAreDefault(state.blendWeights)) {
		params.set(HARMONY_MAP_URL_PARAM_BLEND, encodeBlendWeights(state.blendWeights));
	} else {
		params.delete(HARMONY_MAP_URL_PARAM_BLEND);
	}

	if (state.yearRange === null) {
		params.delete(HARMONY_MAP_URL_PARAM_YEAR_MIN);
		params.delete(HARMONY_MAP_URL_PARAM_YEAR_MAX);
	} else {
		params.set(HARMONY_MAP_URL_PARAM_YEAR_MIN, String(state.yearRange.min));
		params.set(HARMONY_MAP_URL_PARAM_YEAR_MAX, String(state.yearRange.max));
	}
};

export const areHarmonyMapUrlStatesEqual = (
	first: HarmonyMapUrlState,
	second: HarmonyMapUrlState
): boolean =>
	first.method === second.method &&
	first.view === second.view &&
	JSON.stringify(first.blendWeights) === JSON.stringify(second.blendWeights) &&
	yearRangesEqual(first.yearRange, second.yearRange);

export const replaceHarmonyMapStateInUrl = (
	partial: Partial<HarmonyMapUrlState>
): void => {
	const state: HarmonyMapUrlState = {
		...readHarmonyMapUrlState(page.url.searchParams),
		...partial
	};

	if (
		areHarmonyMapUrlStatesEqual(
			state,
			readHarmonyMapUrlState(page.url.searchParams)
		)
	) {
		return;
	}

	const params = new URLSearchParams(page.url.searchParams);
	writeHarmonyMapUrlState(params, state);
	const queryString = params.toString();
	replaceState(
		queryString ? `${page.url.pathname}?${queryString}` : page.url.pathname,
		page.state
	);
};
