import { replaceState } from "$app/navigation";
import { page } from "$app/state";
import {
	isEmbeddingMethod,
	type EmbeddingMethod
} from "./embedding/reducers/types.js";

export const HARMONY_MAP_URL_PARAM_METHOD = "method";

export const DEFAULT_EMBEDDING_METHOD: EmbeddingMethod = "umap";

export type HarmonyMapUrlState = {
	method: EmbeddingMethod;
};

export const readHarmonyMapUrlState = (
	searchParams: URLSearchParams
): HarmonyMapUrlState => {
	const method = searchParams.get(HARMONY_MAP_URL_PARAM_METHOD) ?? "";
	return {
		method: isEmbeddingMethod(method) ? method : DEFAULT_EMBEDDING_METHOD
	};
};

const LEGACY_HARMONY_MAP_URL_PARAM_VIEW = "view";

export const writeHarmonyMapUrlState = (
	params: URLSearchParams,
	state: HarmonyMapUrlState
): void => {
	params.delete(LEGACY_HARMONY_MAP_URL_PARAM_VIEW);

	if (state.method === DEFAULT_EMBEDDING_METHOD) {
		params.delete(HARMONY_MAP_URL_PARAM_METHOD);
	} else {
		params.set(HARMONY_MAP_URL_PARAM_METHOD, state.method);
	}
};

export const areHarmonyMapUrlStatesEqual = (
	first: HarmonyMapUrlState,
	second: HarmonyMapUrlState
): boolean => first.method === second.method;

export const replaceHarmonyMapStateInUrl = (
	state: HarmonyMapUrlState
): void => {
	const hasLegacyViewParam = page.url.searchParams.has(
		LEGACY_HARMONY_MAP_URL_PARAM_VIEW
	);
	if (
		!hasLegacyViewParam &&
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
