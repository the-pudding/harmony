import { replaceState } from "$app/navigation";
import { page } from "$app/state";

export const MAP_MODES = [
	{ id: "hex", label: "hex" },
	{ id: "scatter", label: "full map" }
] as const;

export type MapMode = (typeof MAP_MODES)[number]["id"];

const DEFAULT_MAP_MODE: MapMode = MAP_MODES[0].id;
const MAP_MODE_URL_PARAM = "map";

const isMapMode = (value: string | null): value is MapMode =>
	MAP_MODES.some((mode) => mode.id === value);

export const readMapModeFromUrl = (searchParams: URLSearchParams): MapMode => {
	const value = searchParams.get(MAP_MODE_URL_PARAM);
	return isMapMode(value) ? value : DEFAULT_MAP_MODE;
};

export const replaceMapModeInUrl = (mapMode: MapMode): void => {
	if (mapMode === readMapModeFromUrl(page.url.searchParams)) return;

	const params = new URLSearchParams(page.url.searchParams);
	if (mapMode === DEFAULT_MAP_MODE) params.delete(MAP_MODE_URL_PARAM);
	else params.set(MAP_MODE_URL_PARAM, mapMode);

	const queryString = params.toString();
	replaceState(
		queryString ? `${page.url.pathname}?${queryString}` : page.url.pathname,
		page.state
	);
};
