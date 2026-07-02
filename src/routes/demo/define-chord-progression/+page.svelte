<script lang="ts">
	import debounce from "lodash.debounce";
	import coreProgressionsData from "$data/core-progressions.js";
	import type { CoreProgression } from "$data/core-progressions.js";
	import { onMount, untrack } from "svelte";
	import { replaceState } from "$app/navigation";
	import { page } from "$app/state";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import ToggleSwitch from "../../../chord-search-demo/ToggleSwitch.svelte";
	import SongSelectDropdown from "./SongSelectDropdown.svelte";
	import SongChordsDisplay from "./SongChordsDisplay.svelte";
	import ProgressionMatchTable from "./ProgressionMatchTable.svelte";
	import { computeProgressionMatches } from "./progressionMatchAnalysis.js";
	import { computeRecurringProgressionMatches } from "./recurringProgressionAnalysis.js";
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import { type GroupedSong } from "../progressions/songBrowser.js";
	import {
		fetchGroupedAllSongs,
		fetchGroupedPopularSongs,
		findGroupedSongByKey,
		isGroupedSongKeyKnown,
		sortAllSongs,
		sortPopularSongs
	} from "../progressions/songBrowserData.js";
	import {
		areDefineChordProgressionUrlStatesEqual,
		buildDefineChordProgressionUrlState,
		DEFINE_CHORD_PROGRESSION_URL_DEBOUNCE_MS,
		defineChordProgressionUrlStateToQueryString,
		readDefineChordProgressionUrlState
	} from "./defineChordProgressionUrlParams.js";

	let popularSongs = $state<GroupedSong[]>([]);
	let fullSongs = $state<GroupedSong[] | null>(null);
	let loading = $state(true);
	let loadingFullSongs = $state(false);
	let loadError = $state("");
	let showPopularOnly = $state(true);
	let titleFilter = $state("");
	let selectedKey = $state("");
	let pinnedProgression = $state<string | null>(null);
	const coreProgressions: CoreProgression[] = coreProgressionsData;
	let urlInitialized = $state(false);
	let applyingFromUrl = $state(false);
	let fullSongsLoadPromise = $state<Promise<GroupedSong[]> | null>(null);

	const debouncedReplaceState = debounce((nextUrl: string) => {
		replaceState(nextUrl, page.state);
	}, DEFINE_CHORD_PROGRESSION_URL_DEBOUNCE_MS);

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

	onMount(() => {
		const load = async () => {
			try {
				popularSongs = await fetchGroupedPopularSongs();
			} catch (err) {
				loadError = err instanceof Error ? err.message : String(err);
			} finally {
				loading = false;
			}
		};

		void load();

		return () => debouncedReplaceState.cancel();
	});

	const searchableSongs = $derived(fullSongs ?? popularSongs);

	const baseList = $derived.by((): GroupedSong[] => {
		if (showPopularOnly) {
			return sortPopularSongs(popularSongs);
		}
		return sortAllSongs(fullSongs ?? []);
	});

	const filteredSongs = $derived.by(() => {
		const q = titleFilter.trim().toLowerCase();
		if (!q) return baseList;
		return baseList.filter(
			(song) =>
				song.title.toLowerCase().includes(q) ||
				song.artists.some((artist) => artist.toLowerCase().includes(q))
		);
	});

	const selectedSong = $derived(
		findGroupedSongByKey(searchableSongs, selectedKey)
	);

	const coreProgressionMatches = $derived(
		selectedSong ? computeProgressionMatches(selectedSong, coreProgressions) : []
	);

	const recurringProgressionMatches = $derived(
		selectedSong ? computeRecurringProgressionMatches(selectedSong) : []
	);

	const isSongKeyKnown = (songKey: string): boolean =>
		isGroupedSongKeyKnown(searchableSongs, songKey);

	$effect(() => {
		if (loading || popularSongs.length === 0) return;

		page.url.search;

		untrack(() => {
			applyingFromUrl = true;
			try {
				const urlState = readDefineChordProgressionUrlState(
					page.url.searchParams
				);
				const urlSongKey = urlState.song;
				if (
					urlSongKey &&
					!isGroupedSongKeyKnown(searchableSongs, urlSongKey) &&
					fullSongs === null &&
					!loadingFullSongs
				) {
					void ensureFullSongsLoaded();
					return;
				}
				if (urlSongKey && isGroupedSongKeyKnown(searchableSongs, urlSongKey)) {
					selectedKey = urlSongKey;
				} else if (!urlInitialized) {
					selectedKey = baseList[0]?.songKey ?? "";
				}
				urlInitialized = true;
			} finally {
				applyingFromUrl = false;
			}
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
		if (!urlInitialized || loading || applyingFromUrl) return;

		selectedKey;

		const desiredState = buildDefineChordProgressionUrlState({
			selectedSongKey: selectedKey
		});
		const currentUrlState = readDefineChordProgressionUrlState(
			page.url.searchParams
		);

		if (areDefineChordProgressionUrlStatesEqual(desiredState, currentUrlState)) {
			return;
		}

		const queryString = defineChordProgressionUrlStateToQueryString(desiredState);
		const nextUrl = queryString
			? `${page.url.pathname}?${queryString}`
			: page.url.pathname;

		debouncedReplaceState(nextUrl);
	});

	$effect(() => {
		selectedKey;
		pinnedProgression = null;
	});

	function handleSongSelect(songKey: string) {
		selectedKey = songKey;
	}

	function handlePopularToggleChange(checked: boolean) {
		showPopularOnly = checked;
		if (!checked && fullSongs === null) {
			void ensureFullSongsLoaded();
		}
	}

	function handleProgressionSelect(chordProgression: string) {
		pinnedProgression =
			pinnedProgression === chordProgression ? null : chordProgression;
	}
</script>

<svelte:head>
	<title>harmony — define 'chord progression'</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
	/>
</svelte:head>

<div class="page" style="--top-nav-height: {TOP_NAV_HEIGHT};">
	<TopNavBar showSearch={false} />

	<div class="content">
		<h1 class="page-title">
			How do we determine the core chord progressions that define a songs harmonic
			essense?
		</h1>

		{#if loading}
			<p class="dataset-status">Loading song dataset…</p>
		{:else if loadingFullSongs && !showPopularOnly}
			<p class="dataset-status">Loading full song dataset…</p>
		{:else if loadError}
			<p class="dataset-status error">{loadError}</p>
		{/if}

		{#if baseList.length > 0}
			<section class="step-section">
				<h2 class="section-heading">0. Pick an example song</h2>

				<div class="controls">
					<SongSelectDropdown
						songs={baseList}
						{selectedSong}
						{selectedKey}
						bind:searchQuery={titleFilter}
						onSelectedKeyChange={handleSongSelect}
					/>
					<ToggleSwitch
						checked={showPopularOnly}
						onchange={handlePopularToggleChange}
						label="popular recent songs only"
					/>
				</div>

				<p class="list-meta">
					{#if titleFilter.trim() ? filteredSongs.length === 0 : baseList.length === 0}
						No songs match
					{:else if titleFilter.trim()}
						{filteredSongs.length.toLocaleString()} songs match
					{:else}
						{baseList.length.toLocaleString()} songs
					{/if}
				</p>

				{#if selectedSong}
					<div class="song-card">
						<SongChordsDisplay song={selectedSong} showMetadata />
					</div>
				{/if}
			</section>

			{#if selectedSong}
				<section class="step-section">
					<h2 class="section-heading">
						1. Find all possible chord progressions of 3 chords or more that appear at
						least twice in the song
					</h2>

					{#if recurringProgressionMatches.length > 0}
						<ProgressionMatchTable
							matches={recurringProgressionMatches}
							song={selectedSong}
							activeProgression={pinnedProgression}
							onselect={handleProgressionSelect}
						/>
					{:else}
						<p class="list-meta">
							No recurring progressions of 3+ chords matched this song.
						</p>
					{/if}
				</section>

				<section class="step-section">
					<h2 class="section-heading">2. Look for matches from our core progressions</h2>

					{#if coreProgressionMatches.length > 0}
						<ProgressionMatchTable
							matches={coreProgressionMatches}
							song={selectedSong}
							activeProgression={pinnedProgression}
							onselect={handleProgressionSelect}
						/>
					{:else}
						<p class="list-meta">No core progressions matched this song.</p>
					{/if}
				</section>
			{/if}
		{/if}
	</div>
</div>

<style>
	:global(body > header) {
		display: none;
	}

	:global(body) {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}

	.page {
		background: #09090b;
		color: #f4f4f5;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		padding-top: var(--top-nav-height);
	}

	.content {
		padding: 1.5rem 12px 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		width: 100%;
		max-width: 56rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	.page-title {
		font-size: 1.125rem;
		font-weight: 600;
		line-height: 1.4;
		margin: 0;
		color: #f4f4f5;
	}

	.step-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.section-heading {
		font-size: 0.875rem;
		font-weight: 500;
		margin: 0;
		color: #a1a1aa;
	}

	.dataset-status {
		font-size: 0.75rem;
		color: #71717a;
		margin: 0;
	}

	.dataset-status.error {
		color: #fca5a5;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.list-meta {
		font-size: 0.875rem;
		color: #71717a;
		margin: 0;
	}

	.song-card {
		padding: 0.625rem;
		border: 1px solid #27272a;
		border-radius: 0.25rem;
	}
</style>
