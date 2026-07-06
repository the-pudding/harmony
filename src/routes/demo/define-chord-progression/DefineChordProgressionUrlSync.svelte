<script lang="ts">
	import { untrack } from "svelte";
	import { pushState, replaceState } from "$app/navigation";
	import { page } from "$app/state";
	import { type GroupedSong } from "../progressions/songBrowser.js";
	import { isGroupedSongKeyKnown } from "../progressions/songBrowserData.js";
	import {
		areDefineChordProgressionUrlStatesEqual,
		buildDefineChordProgressionUrlState,
		defineChordProgressionUrlStateToQueryString,
		readDefineChordProgressionUrlState,
		shouldPushSongHistoryChange,
		type DefineChordProgressionUrlState
	} from "./defineChordProgressionUrlParams.js";

	type Props = {
		songsReady: boolean;
		showPopularOnly: boolean;
		searchableSongs: GroupedSong[];
		baseList: GroupedSong[];
		fullSongs: GroupedSong[] | null;
		loadingFullSongs: boolean;
		onEnsureFullSongsLoaded: () => Promise<GroupedSong[]>;
		selectedKey?: string;
		showSongsContext?: boolean;
	};

	let {
		songsReady,
		showPopularOnly,
		searchableSongs,
		baseList,
		fullSongs,
		loadingFullSongs,
		onEnsureFullSongsLoaded,
		selectedKey = $bindable(""),
		showSongsContext = $bindable(false)
	}: Props = $props();

	let urlInitialized = $state(false);
	let applyingFromUrl = $state(false);

	const localUrlState = (): DefineChordProgressionUrlState =>
		buildDefineChordProgressionUrlState({
			selectedSongKey: selectedKey,
			songsContextExpanded: showSongsContext
		});

	const isSongKeyKnown = (songKey: string): boolean =>
		isGroupedSongKeyKnown(searchableSongs, songKey);

	const applyUrlStateToPage = (urlState: DefineChordProgressionUrlState) => {
		if (
			urlInitialized &&
			areDefineChordProgressionUrlStatesEqual(urlState, localUrlState())
		) {
			return;
		}

		applyingFromUrl = true;
		try {
			const urlSongKey = urlState.song;
			if (
				urlSongKey &&
				!isSongKeyKnown(urlSongKey) &&
				fullSongs === null &&
				!loadingFullSongs
			) {
				void onEnsureFullSongsLoaded();
				return;
			}
			if (urlSongKey && isSongKeyKnown(urlSongKey)) {
				selectedKey = urlSongKey;
			} else if (!urlInitialized) {
				selectedKey = baseList[0]?.songKey ?? "";
			}
			showSongsContext = urlState.songsContextExpanded;
			urlInitialized = true;
		} finally {
			applyingFromUrl = false;
		}
	};

	const syncPageStateToUrl = () => {
		const desiredState = localUrlState();
		const currentUrlState = readDefineChordProgressionUrlState(page.url.searchParams);

		if (areDefineChordProgressionUrlStatesEqual(desiredState, currentUrlState)) return;

		const queryString = defineChordProgressionUrlStateToQueryString(desiredState);
		const nextUrl = queryString
			? `${page.url.pathname}?${queryString}`
			: page.url.pathname;

		const updateHistory = shouldPushSongHistoryChange(
			currentUrlState,
			desiredState,
			isSongKeyKnown
		)
			? pushState
			: replaceState;

		updateHistory(nextUrl, page.state);
	};

	$effect(() => {
		if (!songsReady) return;

		page.url.search;

		untrack(() => {
			applyUrlStateToPage(readDefineChordProgressionUrlState(page.url.searchParams));
		});
	});

	$effect(() => {
		if (!urlInitialized || applyingFromUrl) return;

		showPopularOnly;
		baseList;

		if (selectedKey && isSongKeyKnown(selectedKey)) return;

		selectedKey = baseList[0]?.songKey ?? "";
	});

	$effect(() => {
		if (!urlInitialized || !songsReady || applyingFromUrl) return;

		selectedKey;
		showSongsContext;

		untrack(syncPageStateToUrl);
	});
</script>
