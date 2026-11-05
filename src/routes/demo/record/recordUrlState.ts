import { replaceState } from "$app/navigation";
import { page } from "$app/state";
import {
	DEFAULT_RECORD_TAB,
	isRecordTab,
	type RecordTab
} from "./recordTabs.js";
import { SONG_START_SECONDS } from "./songTime.js";
import { DEFAULT_ZOOM, isZoomLevel } from "./timelineZoom.js";

const TAB_URL_PARAM = "tab";
const ZOOM_URL_PARAM = "zoom";
const PLAYHEAD_URL_PARAM = "t";
const SONG_URL_PARAM = "song";
const CLUSTER_URL_PARAM = "cluster";
const PLAYHEAD_URL_DECIMALS = 2;

export type RecordUrlState = {
	zoom: number;
	playheadSeconds: number;
};

const roundPlayheadSeconds = (seconds: number): number =>
	Number(seconds.toFixed(PLAYHEAD_URL_DECIMALS));

export const readRecordTab = (searchParams: URLSearchParams): RecordTab => {
	const tab = searchParams.get(TAB_URL_PARAM) ?? "";
	return isRecordTab(tab) ? tab : DEFAULT_RECORD_TAB;
};

export const readRecordSongKey = (
	searchParams: URLSearchParams
): string | null => searchParams.get(SONG_URL_PARAM);

export const readRecordCluster = (
	searchParams: URLSearchParams
): string | null => searchParams.get(CLUSTER_URL_PARAM);

export const readRecordUrlState = (
	searchParams: URLSearchParams
): RecordUrlState => {
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

export const tabUrlValue = (tab: RecordTab): string | null =>
	tab === DEFAULT_RECORD_TAB ? null : tab;

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

export const replaceTabInUrl = (tab: RecordTab): void =>
	replaceUrlParam(TAB_URL_PARAM, tabUrlValue(tab));

export const replaceZoomInUrl = (zoom: number): void =>
	replaceUrlParam(ZOOM_URL_PARAM, zoomUrlValue(zoom));

export const replacePlayheadInUrl = (seconds: number): void =>
	replaceUrlParam(PLAYHEAD_URL_PARAM, playheadUrlValue(seconds));

export const replaceSongInUrl = (songKey: string): void => {
	replaceUrlParam(SONG_URL_PARAM, songKey);
	replaceUrlParam(PLAYHEAD_URL_PARAM, null);
};

export const replaceClusterInUrl = (cluster: string): void =>
	replaceUrlParam(CLUSTER_URL_PARAM, cluster);
