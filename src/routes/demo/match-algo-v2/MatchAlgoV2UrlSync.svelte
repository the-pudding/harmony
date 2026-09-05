<script lang="ts">
	import { untrack } from "svelte";
	import { replaceState } from "$app/navigation";
	import { page } from "$app/state";
	import {
		areMatchAlgoV2UrlStatesEqual,
		buildMatchAlgoV2UrlState,
		DEFAULT_MATCH_ALGO_V2_TAB,
		matchAlgoV2UrlStateToQueryString,
		readMatchAlgoV2UrlState,
		type MatchAlgoV2Tab,
		type MatchAlgoV2UrlState
	} from "./matchAlgoV2UrlParams.js";

	type Props = {
		ready: boolean;
		knownSongKeys: string[];
		tab?: MatchAlgoV2Tab;
		selectedKey?: string;
	};

	let {
		ready,
		knownSongKeys,
		tab = $bindable(DEFAULT_MATCH_ALGO_V2_TAB),
		selectedKey = $bindable("")
	}: Props = $props();

	let urlInitialized = $state(false);
	let applyingFromUrl = $state(false);

	const knownKeySet = $derived(new Set(knownSongKeys));

	const localUrlState = (): MatchAlgoV2UrlState =>
		buildMatchAlgoV2UrlState({
			tab,
			selectedSongKey: selectedKey
		});

	const applyUrlStateToPage = (urlState: MatchAlgoV2UrlState) => {
		if (
			urlInitialized &&
			areMatchAlgoV2UrlStatesEqual(urlState, localUrlState())
		) {
			return;
		}

		applyingFromUrl = true;
		try {
			tab = urlState.tab;
			if (urlState.song && knownKeySet.has(urlState.song)) {
				selectedKey = urlState.song;
			} else if (!urlInitialized && knownSongKeys[0]) {
				selectedKey = knownSongKeys[0];
			}
			urlInitialized = true;
		} finally {
			applyingFromUrl = false;
		}
	};

	const syncPageStateToUrl = () => {
		const desiredState = localUrlState();
		const currentUrlState = readMatchAlgoV2UrlState(page.url.searchParams);
		if (areMatchAlgoV2UrlStatesEqual(desiredState, currentUrlState)) return;

		const queryString = matchAlgoV2UrlStateToQueryString(desiredState);
		const nextUrl = queryString
			? `${page.url.pathname}?${queryString}`
			: page.url.pathname;
		replaceState(nextUrl, page.state);
	};

	$effect(() => {
		if (!ready) return;
		page.url.search;
		untrack(() => {
			applyUrlStateToPage(readMatchAlgoV2UrlState(page.url.searchParams));
		});
	});

	$effect(() => {
		if (!urlInitialized || applyingFromUrl) return;
		tab;
		selectedKey;
		untrack(syncPageStateToUrl);
	});
</script>
