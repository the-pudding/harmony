export const MATCH_ALGO_V2_URL_PARAM_TAB = "tab";
export const MATCH_ALGO_V2_URL_PARAM_SONG = "song";

export const MATCH_ALGO_V2_TAB_TRICKY = "tricky";
export const MATCH_ALGO_V2_TAB_OVERVIEW = "overview";

export const MATCH_ALGO_V2_TABS = [
	MATCH_ALGO_V2_TAB_TRICKY,
	MATCH_ALGO_V2_TAB_OVERVIEW
] as const;

export type MatchAlgoV2Tab = (typeof MATCH_ALGO_V2_TABS)[number];

export const DEFAULT_MATCH_ALGO_V2_TAB: MatchAlgoV2Tab = MATCH_ALGO_V2_TAB_TRICKY;

export const MATCH_ALGO_V2_TAB_LABELS: Record<MatchAlgoV2Tab, string> = {
	[MATCH_ALGO_V2_TAB_TRICKY]: "Tricky songs",
	[MATCH_ALGO_V2_TAB_OVERVIEW]: "Overview"
};

export const isMatchAlgoV2Tab = (value: string): value is MatchAlgoV2Tab =>
	(MATCH_ALGO_V2_TABS as readonly string[]).includes(value);

export type MatchAlgoV2UrlState = {
	tab: MatchAlgoV2Tab;
	song: string;
};

export const readMatchAlgoV2UrlState = (
	searchParams: URLSearchParams
): MatchAlgoV2UrlState => {
	const tab = searchParams.get(MATCH_ALGO_V2_URL_PARAM_TAB) ?? "";
	return {
		tab: isMatchAlgoV2Tab(tab) ? tab : DEFAULT_MATCH_ALGO_V2_TAB,
		song: searchParams.get(MATCH_ALGO_V2_URL_PARAM_SONG) ?? ""
	};
};

export const buildMatchAlgoV2UrlState = (state: {
	tab: MatchAlgoV2Tab;
	selectedSongKey: string;
}): MatchAlgoV2UrlState => ({
	tab: state.tab,
	song: state.selectedSongKey
});

export const matchAlgoV2UrlStateToQueryString = (
	state: MatchAlgoV2UrlState
): string => {
	const params = new URLSearchParams();
	if (state.tab !== DEFAULT_MATCH_ALGO_V2_TAB) {
		params.set(MATCH_ALGO_V2_URL_PARAM_TAB, state.tab);
	}
	if (state.song) {
		params.set(MATCH_ALGO_V2_URL_PARAM_SONG, state.song);
	}
	return params.toString();
};

export const areMatchAlgoV2UrlStatesEqual = (
	first: MatchAlgoV2UrlState,
	second: MatchAlgoV2UrlState
): boolean => first.tab === second.tab && first.song === second.song;
