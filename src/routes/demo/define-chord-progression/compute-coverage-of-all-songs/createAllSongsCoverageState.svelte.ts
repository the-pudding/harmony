import { onMount, onDestroy, untrack } from "svelte";
import { page } from "$app/state";
import type { GroupedSong } from "../../../../data/songBrowser.js";
import {
	fetchGroupedAllSongs,
	fetchGroupedRecentSongs,
	sortAllSongs,
	sortRecentSongs
} from "../../../../data/songBrowserData.js";
import {
	areSongCorpusFilterUrlStatesEqual,
	readSongCorpusFilterUrlState,
	replaceSongCorpusFilterInUrl,
	type SongCorpusFilterUrlState
} from "../../songCorpusFilterUrlParams.js";
import {
	initCoverageWorkerPool,
	computeCoverageOfAllSongs,
	terminateCoverageWorkerPool,
	type AllSongsCoverageResult
} from "./index.js";

export const createAllSongsCoverageState = () => {
	const initialFilters = readSongCorpusFilterUrlState(page.url.searchParams);

	let recentSongs = $state<GroupedSong[]>([]);
	let fullSongs = $state<GroupedSong[] | null>(null);
	let loading = $state(true);
	let loadingFullSongs = $state(false);
	let loadError = $state("");
	let showRecentOnly = $state(initialFilters.showRecentOnly);
	let fullSongsLoadPromise: Promise<GroupedSong[]> | null = null;
	let allSongsCoverageResult = $state<AllSongsCoverageResult | null>(null);
	let coverageRequestId = 0;
	let applyingFromUrl = false;

	const corpusFilterState = (): SongCorpusFilterUrlState => ({
		showRecentOnly
	});

	const syncCorpusFiltersToUrl = () => {
		replaceSongCorpusFilterInUrl(corpusFilterState());
	};

	const ensureFullSongsLoaded = (): Promise<GroupedSong[]> => {
		if (fullSongs !== null) return Promise.resolve(fullSongs);
		if (fullSongsLoadPromise) return fullSongsLoadPromise;

		loadingFullSongs = true;
		const promise = fetchGroupedAllSongs()
			.then((songs) => {
				fullSongs = songs;
				return songs;
			})
			.catch((err) => {
				loadError = err instanceof Error ? err.message : String(err);
				throw err;
			})
			.finally(() => {
				loadingFullSongs = false;
				fullSongsLoadPromise = null;
			});

		fullSongsLoadPromise = promise;
		return promise;
	};

	const applyCorpusFiltersFromUrl = (urlState: SongCorpusFilterUrlState) => {
		if (areSongCorpusFilterUrlStatesEqual(urlState, corpusFilterState())) {
			return;
		}

		applyingFromUrl = true;
		try {
			showRecentOnly = urlState.showRecentOnly;
			if (!showRecentOnly && fullSongs === null) {
				void ensureFullSongsLoaded();
			}
		} finally {
			applyingFromUrl = false;
		}
	};

	const baseList = $derived.by((): GroupedSong[] =>
		showRecentOnly
			? sortRecentSongs(recentSongs)
			: sortAllSongs(fullSongs ?? [])
	);

	$effect(() => {
		const songs = baseList;
		allSongsCoverageResult = null;
		let active = true;
		const requestId = ++coverageRequestId;

		void initCoverageWorkerPool($state.snapshot(songs)).then(async () => {
			if (!active) return;
			const coverages = await computeCoverageOfAllSongs(requestId);
			if (active) allSongsCoverageResult = coverages;
		});

		return () => {
			active = false;
			terminateCoverageWorkerPool();
		};
	});

	$effect(() => {
		page.url.search;
		if (applyingFromUrl) return;
		untrack(() => {
			applyCorpusFiltersFromUrl(
				readSongCorpusFilterUrlState(page.url.searchParams)
			);
		});
	});

	onMount(() => {
		void (async () => {
			try {
				recentSongs = await fetchGroupedRecentSongs();
				if (!showRecentOnly) {
					await ensureFullSongsLoaded();
				}
			} catch (err) {
				loadError = err instanceof Error ? err.message : String(err);
			} finally {
				loading = false;
			}
		})();
	});

	onDestroy(() => terminateCoverageWorkerPool());

	const handleRecentToggleChange = (checked: boolean) => {
		showRecentOnly = checked;
		if (!checked && fullSongs === null) {
			void ensureFullSongsLoaded();
		}
		syncCorpusFiltersToUrl();
	};

	return {
		get recentSongs() {
			return recentSongs;
		},
		get fullSongs() {
			return fullSongs;
		},
		get loading() {
			return loading;
		},
		get loadingFullSongs() {
			return loadingFullSongs;
		},
		get loadError() {
			return loadError;
		},
		get showRecentOnly() {
			return showRecentOnly;
		},
		get baseList() {
			return baseList;
		},
		get allSongsCoverageResult() {
			return allSongsCoverageResult;
		},
		ensureFullSongsLoaded,
		handleRecentToggleChange
	};
};
