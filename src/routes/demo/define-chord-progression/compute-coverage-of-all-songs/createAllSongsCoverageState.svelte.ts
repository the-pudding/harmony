import { onMount, onDestroy } from "svelte";
import type { GroupedSong } from "../../../../data/songBrowser.js";
import {
	fetchGroupedAllSongs,
	fetchGroupedPopularSongs,
	sortAllSongs,
	sortPopularSongs
} from "../../../../data/songBrowserData.js";
import {
	initCoverageWorkerPool,
	computeCoverageOfAllSongs,
	terminateCoverageWorkerPool,
	type AllSongsCoverageResult
} from "./index.js";

export const createAllSongsCoverageState = () => {
	let popularSongs = $state<GroupedSong[]>([]);
	let fullSongs = $state<GroupedSong[] | null>(null);
	let loading = $state(true);
	let loadingFullSongs = $state(false);
	let loadError = $state("");
	let showPopularOnly = $state(true);
	let fullSongsLoadPromise: Promise<GroupedSong[]> | null = null;
	let allSongsCoverageResult = $state<AllSongsCoverageResult | null>(null);
	let coverageRequestId = 0;

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

	const baseList = $derived.by((): GroupedSong[] => {
		if (showPopularOnly) {
			return sortPopularSongs(popularSongs);
		}
		return sortAllSongs(fullSongs ?? []);
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

	onMount(() => {
		void (async () => {
			try {
				popularSongs = await fetchGroupedPopularSongs();
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
		get baseList() {
			return baseList;
		},
		get allSongsCoverageResult() {
			return allSongsCoverageResult;
		},
		ensureFullSongsLoaded,
		handlePopularToggleChange
	};
};
