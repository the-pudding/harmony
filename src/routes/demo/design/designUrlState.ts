import { replaceState } from "$app/navigation";
import { page } from "$app/state";
import {
	DEFAULT_DESIGN_TAB,
	isDesignTab,
	type DesignTab
} from "./designTabs.js";
import { SONG_START_SECONDS } from "./songTime.js";
import { DEFAULT_ZOOM, isZoomLevel } from "./timelineZoom.js";

const TAB_URL_PARAM = "tab";
const ZOOM_URL_PARAM = "zoom";
const PLAYHEAD_URL_PARAM = "t";
const PLAYHEAD_URL_DECIMALS = 2;

export type DesignUrlState = {
	zoom: number;
	playheadSeconds: number;
};

const roundPlayheadSeconds = (seconds: number): number =>
	Number(seconds.toFixed(PLAYHEAD_URL_DECIMALS));

export const readDesignTab = (searchParams: URLSearchParams): DesignTab => {
	const tab = searchParams.get(TAB_URL_PARAM) ?? "";
	return isDesignTab(tab) ? tab : DEFAULT_DESIGN_TAB;
};

export const readDesignUrlState = (
	searchParams: URLSearchParams
): DesignUrlState => {
	const zoom = Number(searchParams.get(ZOOM_URL_PARAM));
	const playheadSeconds = Number(searchParams.get(PLAYHEAD_URL_PARAM));
	return {
		zoom: isZoomLevel(zoom) ? zoom : DEFAULT_ZOOM,
		playheadSeconds:
			Number.isFinite(playheadSeconds) && playheadSeconds > SONG_START_SECONDS
				? playheadSeconds
				: SONG_START_SECONDS
	};
};

export const tabUrlValue = (tab: DesignTab): string | null =>
	tab === DEFAULT_DESIGN_TAB ? null : tab;

export const zoomUrlValue = (zoom: number): string | null =>
	zoom === DEFAULT_ZOOM ? null : String(zoom);

export const playheadUrlValue = (seconds: number): string | null => {
	const rounded = roundPlayheadSeconds(seconds);
	return rounded > SONG_START_SECONDS ? String(rounded) : null;
};

const replaceUrlParam = (param: string, value: string | null): void => {
	if (page.url.searchParams.get(param) === value) return;

	const params = new URLSearchParams(page.url.searchParams);
	if (value === null) params.delete(param);
	else params.set(param, value);

	const queryString = params.toString();
	replaceState(
		queryString ? `${page.url.pathname}?${queryString}` : page.url.pathname,
		page.state
	);
};

export const replaceTabInUrl = (tab: DesignTab): void =>
	replaceUrlParam(TAB_URL_PARAM, tabUrlValue(tab));

export const replaceZoomInUrl = (zoom: number): void =>
	replaceUrlParam(ZOOM_URL_PARAM, zoomUrlValue(zoom));

export const replacePlayheadInUrl = (seconds: number): void =>
	replaceUrlParam(PLAYHEAD_URL_PARAM, playheadUrlValue(seconds));
