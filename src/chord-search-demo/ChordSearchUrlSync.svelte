<script lang="ts">
	import { untrack } from "svelte";
	import { replaceState } from "$app/navigation";
	import { page } from "$app/state";
	import { chordSearchDemoStore } from "./chordSearchDemoStore.svelte.js";
	import {
		areChordSearchUrlStatesEqual,
		buildChordSearchUrlState,
		chordSearchUrlStateToQueryString,
		isValidProgressionParam,
		readChordSearchUrlState,
		type ChordSearchUrlState
	} from "./chordSearchUrlParams.js";

	type Props = {
		songsReady: boolean;
	};

	let { songsReady }: Props = $props();

	let applyingFromUrl = $state(false);

	const storeUrlState = (): ChordSearchUrlState =>
		buildChordSearchUrlState({
			searchChords: chordSearchDemoStore.searchChords,
			selectedArtist: chordSearchDemoStore.selectedArtist,
			titleFilter: chordSearchDemoStore.titleFilter
		});

	const applyUrlStateToStore = (urlState: ChordSearchUrlState) => {
		const currentStoreState = storeUrlState();
		if (areChordSearchUrlStatesEqual(urlState, currentStoreState)) return;

		applyingFromUrl = true;
		try {
			if (urlState.progression !== currentStoreState.progression) {
				if (
					urlState.progression &&
					isValidProgressionParam(urlState.progression)
				) {
					chordSearchDemoStore.setSearchFromSequenceLabel(urlState.progression);
				} else if (!urlState.progression) {
					chordSearchDemoStore.clearSearch();
				}
			}

			if (urlState.artist !== currentStoreState.artist) {
				chordSearchDemoStore.setSelectedArtist(urlState.artist);
			}

			if (urlState.song !== currentStoreState.song) {
				chordSearchDemoStore.setTitleFilter(urlState.song);
			}
		} finally {
			applyingFromUrl = false;
		}
	};

	$effect(() => {
		if (!songsReady) return;

		page.url.search;

		untrack(() => {
			applyUrlStateToStore(readChordSearchUrlState(page.url.searchParams));
		});
	});

	$effect(() => {
		if (!songsReady || applyingFromUrl) return;

		chordSearchDemoStore.searchChords;
		chordSearchDemoStore.selectedArtist;
		chordSearchDemoStore.titleFilter;

		const desiredState = storeUrlState();
		const currentUrlState = readChordSearchUrlState(page.url.searchParams);

		if (areChordSearchUrlStatesEqual(desiredState, currentUrlState)) return;

		const queryString = chordSearchUrlStateToQueryString(desiredState);
		const nextUrl = queryString
			? `${page.url.pathname}?${queryString}`
			: page.url.pathname;

		replaceState(nextUrl, page.state);
	});
</script>
