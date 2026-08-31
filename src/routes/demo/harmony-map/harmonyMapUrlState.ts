import { replaceState } from "$app/navigation";
import { page } from "$app/state";
import {
	isEmbeddingMethod,
	type EmbeddingMethod
} from "./embedding/reducers/types.js";
import {
	DEFAULT_MAP_VIEW_MODE,
	MAP_VIEW_MODE_TO_URL,
	mapViewModeFromUrl,
	type MapViewMode
} from "./viewMode.js";

export const HARMONY_MAP_URL_PARAM_METHOD = "method";
export const HARMONY_MAP_URL_PARAM_VIEW = "view";

export const DEFAULT_EMBEDDING_METHOD: EmbeddingMethod = "umap";

export type HarmonyMapUrlState = {
	method: EmbeddingMethod;
	view: MapViewMode;
};

export const readHarmonyMapUrlState = (
	searchParams: URLSearchParams
): HarmonyMapUrlState => {
	const method = searchParams.get(HARMONY_MAP_URL_PARAM_METHOD) ?? "";
	const view = searchParams.get(HARMONY_MAP_URL_PARAM_VIEW) ?? "";
	return {
		method: isEmbeddingMethod(method) ? method : DEFAULT_EMBEDDING_METHOD,
		view: mapViewModeFromUrl(view) ?? DEFAULT_MAP_VIEW_MODE
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
};

export const areHarmonyMapUrlStatesEqual = (
	first: HarmonyMapUrlState,
	second: HarmonyMapUrlState
): boolean => first.method === second.method && first.view === second.view;

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
