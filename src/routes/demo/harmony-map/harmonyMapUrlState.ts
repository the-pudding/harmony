import { replaceState } from "$app/navigation";
import { page } from "$app/state";
import {
	isEmbeddingMethod,
	type EmbeddingMethod
} from "./embedding/reducers/types.js";

export const HARMONY_MAP_URL_PARAM_VIEW = "view";
export const HARMONY_MAP_URL_PARAM_METHOD = "method";

export type HarmonyMapView = "graph" | "embedding";

export const HARMONY_MAP_VIEWS: HarmonyMapView[] = ["graph", "embedding"];
export const DEFAULT_HARMONY_MAP_VIEW: HarmonyMapView = "graph";
export const DEFAULT_EMBEDDING_METHOD: EmbeddingMethod = "umap";

export type HarmonyMapUrlState = {
	view: HarmonyMapView;
	method: EmbeddingMethod;
};

const isHarmonyMapView = (value: string): value is HarmonyMapView =>
	(HARMONY_MAP_VIEWS as string[]).includes(value);

export const readHarmonyMapUrlState = (
	searchParams: URLSearchParams
): HarmonyMapUrlState => {
	const view = searchParams.get(HARMONY_MAP_URL_PARAM_VIEW) ?? "";
	const method = searchParams.get(HARMONY_MAP_URL_PARAM_METHOD) ?? "";
	return {
		view: isHarmonyMapView(view) ? view : DEFAULT_HARMONY_MAP_VIEW,
		method: isEmbeddingMethod(method) ? method : DEFAULT_EMBEDDING_METHOD
	};
};

export const writeHarmonyMapUrlState = (
	params: URLSearchParams,
	state: HarmonyMapUrlState
): void => {
	if (state.view === DEFAULT_HARMONY_MAP_VIEW) {
		params.delete(HARMONY_MAP_URL_PARAM_VIEW);
	} else {
		params.set(HARMONY_MAP_URL_PARAM_VIEW, state.view);
	}

	if (state.method === DEFAULT_EMBEDDING_METHOD) {
		params.delete(HARMONY_MAP_URL_PARAM_METHOD);
	} else {
		params.set(HARMONY_MAP_URL_PARAM_METHOD, state.method);
	}
};

export const areHarmonyMapUrlStatesEqual = (
	first: HarmonyMapUrlState,
	second: HarmonyMapUrlState
): boolean => first.view === second.view && first.method === second.method;

export const replaceHarmonyMapStateInUrl = (
	state: HarmonyMapUrlState
): void => {
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
