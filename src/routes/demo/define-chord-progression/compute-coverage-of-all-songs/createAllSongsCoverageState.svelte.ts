import { onMount, onDestroy } from "svelte";
import type { GroupedSong } from "../../../../data/songBrowser.js";
import {
	fetchGroupedAllSongs,
	sortAllSongs
} from "../../../../data/songBrowserData.js";
import {
	initCoverageWorkerPool,
	computeCoverageOfAllSongs,
	terminateCoverageWorkerPool,
	type AllSongsCoverageResult
} from "./index.js";
import coreProgressionsData from "$data/core-progressions.js";
import { getCachedCoverage, setCachedCoverage } from "./coverageResultCache.js";

export const createAllSongsCoverageState = () => {
	// Raw, not deep $state: the corpus is tens of thousands of songs, and
	// nothing mutates them in place, so per-object proxies are pure cost.
	let songs = $state.raw<GroupedSong[]>([]);
	let loading = $state(true);
	let loadError = $state("");
	let allSongsCoverageResult = $state.raw<AllSongsCoverageResult | null>(null);
	let coverageCacheKey = $state<string | null>(null);
	let coverageRequestId = 0;

	const baseList = $derived(sortAllSongs(songs));

	$effect(() => {
		const songList = baseList;
		if (songList.length === 0) return;

		allSongsCoverageResult = null;
		let active = true;
		const requestId = ++coverageRequestId;

		void (async () => {
			const { key, result: cached } = await getCachedCoverage(
				coreProgressionsData,
				songList
			);

			if (!active) return;
			coverageCacheKey = key;

			if (cached) {
				allSongsCoverageResult = cached;
				return;
			}

			await initCoverageWorkerPool(songList);
			if (!active) return;

			const coverages = await computeCoverageOfAllSongs(requestId);
			// Each worker holds its own copy of its songs; free them now
			// rather than when the page unmounts.
			terminateCoverageWorkerPool();
			if (!active) return;

			allSongsCoverageResult = coverages;
			void setCachedCoverage(key, coverages);
		})();

		return () => {
			active = false;
			terminateCoverageWorkerPool();
		};
	});

	onMount(() => {
		void fetchGroupedAllSongs()
			.then((fetched) => {
				songs = fetched;
			})
			.catch((err) => {
				loadError = err instanceof Error ? err.message : String(err);
			})
			.finally(() => {
				loading = false;
			});
	});

	onDestroy(() => terminateCoverageWorkerPool());

	return {
		get songs() {
			return songs;
		},
		get baseList() {
			return baseList;
		},
		get loading() {
			return loading;
		},
		get loadError() {
			return loadError;
		},
		get allSongsCoverageResult() {
			return allSongsCoverageResult;
		},
		get coverageCacheKey() {
			return coverageCacheKey;
		}
	};
};
