import { onMount, onDestroy, untrack } from "svelte";
import { page } from "$app/state";
import type { GroupedSong } from "../../../../data/songBrowser.js";
import {
	fetchGroupedAllSongs,
	fetchGroupedPopularSongs,
	sortAllSongs,
	sortPopularSongs
} from "../../../../data/songBrowserData.js";
import {
	areSongCorpusFilterUrlStatesEqual,
	MIN_SECTIONS_FOR_MULTI_SECTION_FILTER,
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

const applySectionCountFilter = (
	songs: GroupedSong[],
	requireMultipleSections: boolean
): GroupedSong[] => {
	if (!requireMultipleSections) return songs;
	return songs.filter(
		(song) => song.sections.length >= MIN_SECTIONS_FOR_MULTI_SECTION_FILTER
	);
};

export const createAllSongsCoverageState = () => {
	const initialFilters = readSongCorpusFilterUrlState(page.url.searchParams);

	let popularSongs = $state<GroupedSong[]>([]);
	let fullSongs = $state<GroupedSong[] | null>(null);
	let loading = $state(true);
	let loadingFullSongs = $state(false);
	let loadError = $state("");
	let showPopularOnly = $state(initialFilters.showPopularOnly);
	let requireMultipleSections = $state(initialFilters.requireMultipleSections);
	let fullSongsLoadPromise: Promise<GroupedSong[]> | null = null;
	let allSongsCoverageResult = $state<AllSongsCoverageResult | null>(null);
	let coverageRequestId = 0;
	let applyingFromUrl = false;

	const corpusFilterState = (): SongCorpusFilterUrlState => ({
		showPopularOnly,
		requireMultipleSections
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
			showPopularOnly = urlState.showPopularOnly;
			requireMultipleSections = urlState.requireMultipleSections;
			if (!showPopularOnly && fullSongs === null) {
				void ensureFullSongsLoaded();
			}
		} finally {
			applyingFromUrl = false;
		}
	};

	const baseList = $derived.by((): GroupedSong[] => {
		const dataset = showPopularOnly
			? sortPopularSongs(popularSongs)
			: sortAllSongs(fullSongs ?? []);
		return applySectionCountFilter(dataset, requireMultipleSections);
	});

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
				popularSongs = await fetchGroupedPopularSongs();
				if (!showPopularOnly) {
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

	const handlePopularToggleChange = (checked: boolean) => {
		showPopularOnly = checked;
		if (!checked && fullSongs === null) {
			void ensureFullSongsLoaded();
		}
		syncCorpusFiltersToUrl();
	};

	const handleRequireMultipleSectionsToggleChange = (checked: boolean) => {
		requireMultipleSections = checked;
		syncCorpusFiltersToUrl();
	};

	return {
		get popularSongs() {
			return popularSongs;
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
		get showPopularOnly() {
			return showPopularOnly;
		},
		get requireMultipleSections() {
			return requireMultipleSections;
		},
		get baseList() {
			return baseList;
		},
		get allSongsCoverageResult() {
			return allSongsCoverageResult;
		},
		ensureFullSongsLoaded,
		handlePopularToggleChange,
		handleRequireMultipleSectionsToggleChange
	};
};
