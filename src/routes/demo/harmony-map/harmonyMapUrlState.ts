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

export const DEFAULT_EMBEDDING_METHOD: EmbeddingMethod = "groupBlend";

export type HarmonyMapUrlState = {
	method: EmbeddingMethod;
	view: MapViewMode;
	blendWeights: BlendWeights;
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

export const readHarmonyMapUrlState = (
	searchParams: URLSearchParams
): HarmonyMapUrlState => {
	const method = searchParams.get(HARMONY_MAP_URL_PARAM_METHOD) ?? "";
	const view = searchParams.get(HARMONY_MAP_URL_PARAM_VIEW) ?? "";
	const bw = searchParams.get(HARMONY_MAP_URL_PARAM_BLEND);
	return {
		method: isEmbeddingMethod(method) ? method : DEFAULT_EMBEDDING_METHOD,
		view: mapViewModeFromUrl(view) ?? DEFAULT_MAP_VIEW_MODE,
		blendWeights: bw ? parseBlendWeights(bw) : DEFAULT_BLEND_WEIGHTS
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
};

export const areHarmonyMapUrlStatesEqual = (
	first: HarmonyMapUrlState,
	second: HarmonyMapUrlState
): boolean =>
	first.method === second.method &&
	first.view === second.view &&
	JSON.stringify(first.blendWeights) === JSON.stringify(second.blendWeights);

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
