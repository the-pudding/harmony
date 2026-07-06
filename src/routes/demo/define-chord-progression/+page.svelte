<script lang="ts">
	import coreProgressionsData from "$data/core-progressions.js";
	import type { CoreProgression } from "$data/core-progressions.js";
	import { onMount, onDestroy, untrack } from "svelte";
	import { replaceState } from "$app/navigation";
	import { page } from "$app/state";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import ToggleSwitch from "../../../chord-search-demo/ToggleSwitch.svelte";
	import SongSelectDropdown from "./components/SongSelectDropdown.svelte";
	import ProgressionMatchTable from "./components/ProgressionMatchTable.svelte";
	import FinalAnnotatedSong from "./components/FinalAnnotatedSong.svelte";
	import ProgressionDefinitionCriteriaTable from "./components/ProgressionDefinitionCriteriaTable.svelte";
	import CodeReference from "./components/CodeReference.svelte";
	import CollapsiblePanel from "./components/CollapsiblePanel.svelte";
	import CoreProgressionRow from "./components/CoreProgressionRow.svelte";
	import SongCoverageBeeswarm from "./components/SongCoverageBeeswarm.svelte";
	import {
		initCoverageWorkerPool,
		computeCoverageOfAllSongs,
		terminateCoverageWorkerPool,
		type AllSongsCoverageResult
	} from "./compute-coverage-of-all-songs/index.js";
	import { MIN_PROGRESSION_OCCURRENCES } from "./progression-matching-logic/progressionMatchAnalysis.js";
	import {
		MIN_PROGRESSION_LENGTH,
		MAX_PROGRESSION_LENGTH
	} from "./progression-matching-logic/progressionConstraints.js";
	import type { ChordAnnotation } from "./progression-matching-logic/progressionMatchAnalysis.js";
	import { selectFinalProgressions, buildFinalChordAnnotations } from "./progression-matching-logic/finalProgressionSelection.js";
	import { findStrictSubsetKeys, applySubsetFlag } from "./progression-matching-logic/strictSubsetProgressions.js";
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
		defineChordProgressionUrlStateToQueryString,
		readDefineChordProgressionUrlState,
		type DefineChordProgressionUrlState
	} from "./defineChordProgressionUrlParams.js";
	import { EXPLAINED_THRESHOLD_PERCENT } from "./constants.js";

	let popularSongs = $state<GroupedSong[]>([]);
	let fullSongs = $state<GroupedSong[] | null>(null);
	let loading = $state(true);
	let loadingFullSongs = $state(false);
	let loadError = $state("");
	let showPopularOnly = $state(true);
	let titleFilter = $state("");
	let selectedKey = $state("");
	let pinnedProgression = $state<string | null>(null);
	let showSongsContext = $state(false);
	const coreProgressions: CoreProgression[] = coreProgressionsData;
	let urlInitialized = $state(false);
	let applyingFromUrl = $state(false);
	let fullSongsLoadPromise = $state<Promise<GroupedSong[]> | null>(null);

	const localUrlState = (): DefineChordProgressionUrlState =>
		buildDefineChordProgressionUrlState({
			selectedSongKey: selectedKey,
			songsContextExpanded: showSongsContext
		});

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

		replaceState(nextUrl, page.state);
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

	const GREEDY_SORT_LABEL = "highest song coverage first (length of progression as tiebreaker)";

	const finalSelection = $derived(
		selectedSong
			? selectFinalProgressions(selectedSong, coreProgressions)
			: {
					coreMatches: [],
					gapCandidates: [],
					coreSelected: [],
					gapSelected: [],
					coverage: [],
					explainedPercent: 0
				}
	);

	const strictSubsetKeys = $derived(
		findStrictSubsetKeys([
			...finalSelection.coreMatches,
			...finalSelection.gapCandidates
		])
	);

	const flaggedCoreMatches = $derived(
		applySubsetFlag(finalSelection.coreMatches, strictSubsetKeys)
	);

	const flaggedCoreSelected = $derived(
		applySubsetFlag(finalSelection.coreSelected, strictSubsetKeys)
	);

	const flaggedGapCandidates = $derived(
		applySubsetFlag(finalSelection.gapCandidates, strictSubsetKeys)
	);

	const flaggedGapSelected = $derived(
		applySubsetFlag(finalSelection.gapSelected, strictSubsetKeys)
	);

	const explainedPercent = $derived(finalSelection.explainedPercent);

	let allSongsCoverageResult = $state<AllSongsCoverageResult | null>(null);
	let coverageRequestId = 0;

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

	onDestroy(() => terminateCoverageWorkerPool());

	const finalMatches = $derived([
		...flaggedCoreSelected,
		...flaggedGapSelected
	]);

	const songAnnotations = $derived<ChordAnnotation[]>(
		selectedSong
			? buildFinalChordAnnotations(selectedSong, finalSelection)
			: []
	);

	const isSongKeyKnown = (songKey: string): boolean =>
		isGroupedSongKeyKnown(searchableSongs, songKey);

	$effect(() => {
		if (loading || popularSongs.length === 0) return;

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
		if (!urlInitialized || loading || applyingFromUrl) return;

		selectedKey;
		showSongsContext;

		untrack(syncPageStateToUrl);
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
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
	/>
</svelte:head>

<div class="page" style="--top-nav-height: {TOP_NAV_HEIGHT};">
	<TopNavBar showSearch={false} />

	<div class="content">
		<h1 class="page-title">
			A. What defines a chord progression? B. Given there are many possible ways to slice a song, what algorithm do we apply to maximize coverage but also prioritize our
			predefined <CodeReference filename="core-progressions.ts" />?
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
				<h2 class="section-heading">Pick an example song to see how the algorithm works on it</h2>

				<CollapsiblePanel
					expandLabel="How well the algorithm is doing across all songs?"
					collapseLabel="How well the algorithm is doing across all songs?"
					bind:expanded={showSongsContext}
				>
					<div class="section-description">
						match % measured based on if the progression ultimately was deemed a chord
						progression in the song (not just if it appeared at all)
					</div>
					<CoreProgressionRow
						{coreProgressions}
						selectedSong={selectedSong ?? null}
						activeProgression={pinnedProgression}
						progressionMatchRates={allSongsCoverageResult?.progressionMatchRates ?? null}
						onselect={handleProgressionSelect}
					/>

					<SongCoverageBeeswarm
						songs={allSongsCoverageResult?.songCoverages ?? null}
						selectedSongKey={selectedKey}
						highlightedProgression={pinnedProgression}
						onSelectSong={handleSongSelect}
					/>
				</CollapsiblePanel>

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
			</section>

			{#if selectedSong}
				<h3 class="walkthrough-heading">END RESULT</h3>

				<section class="step-section">
					<h2 class="section-heading">
						Here are the final chord progressions selected for this song, which cover <span class="coverage-highlight">{explainedPercent}%{explainedPercent > EXPLAINED_THRESHOLD_PERCENT ? " ✅" : " 😔"}</span> of all chords
					</h2>

					<FinalAnnotatedSong
						song={selectedSong}
						matches={finalMatches}
						annotations={songAnnotations}
						{explainedPercent}
						isExplained={explainedPercent > EXPLAINED_THRESHOLD_PERCENT}
						activeProgression={pinnedProgression}
						onselect={handleProgressionSelect}
					/>
				</section>

				<h3 class="walkthrough-heading">DEFINE PROGRESSION</h3>

				<CollapsiblePanel
					expandLabel="Expand progression definition criteria"
					collapseLabel="Collapse progression definition criteria"
				>
					<ProgressionDefinitionCriteriaTable />
				</CollapsiblePanel>

				<h3 class="walkthrough-heading">WALKTHROUGH OF ALGORITHM</h3>

				<section class="step-section">
				<h2 class="section-heading">
				1. Greedily select any non-overlapping core-progressions that appear
				at least <span class="const-value">{MIN_PROGRESSION_OCCURRENCES}</span> times, by {GREEDY_SORT_LABEL}
			</h2>
					<p class="section-description">
						Being "greedy" with core-progressions incentivizes us to really expand the coverage of
						<CodeReference filename="core-progressions.ts" />, and also makes it so we maximize classified chords over
						random ones that might happen to be better/longer for some reason.
					</p>

				{#if flaggedCoreSelected.length > 0}
					<ProgressionMatchTable
						matches={flaggedCoreSelected}
						allMatches={flaggedCoreMatches}
						song={selectedSong}
						activeProgression={pinnedProgression}
						onselect={handleProgressionSelect}
					/>
					{:else}
						<p class="list-meta">No core progressions matched this song.</p>
					{/if}
				</section>

				<section class="step-section">
				<h2 class="section-heading">
					2. Look for any other recurring progressions in the to gaps not occupied by core-progressions, selecting them greedily by {GREEDY_SORT_LABEL}
				</h2>
					<p class="section-description">
						Among chords not yet covered by core progressions, we look for
						progressions of
						<span class="const-value">{MIN_PROGRESSION_LENGTH}</span>–<span
							class="const-value">{MAX_PROGRESSION_LENGTH}</span> chords that recur at
						least twice as complete instances lying entirely inside the gaps.
						Selected gap progressions are also pairwise non-overlapping — no chord
						position is ever claimed by more than one progression. A valid
						progression cannot consist of consecutive
						<span class="const-value">{MIN_PROGRESSION_LENGTH}</span>+ progressions
						repeating more than once.
					</p>

				{#if flaggedGapSelected.length > 0}
					<ProgressionMatchTable
						matches={flaggedGapSelected}
						allMatches={flaggedGapCandidates}
						song={selectedSong}
						activeProgression={pinnedProgression}
						onselect={handleProgressionSelect}
					/>
					{:else}
						<p class="list-meta">No additional non-core progressions to add.</p>
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
		font-size: 1rem;
		font-weight: 700;
		margin-top: 0.25rem;
		margin-bottom: 0;
		color: white;
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
		font-style: italic;
		color: #545454;
		margin: 0;
	}

	.section-description {
		font-size: 0.8125rem;
		color: #71717a;
		margin: 0;
		line-height: 1.5;
	}

	.walkthrough-heading {
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: #71717a;
		margin: 2.5rem 0 0.25rem;
	}

	.const-value {
		font-weight: 700;
		text-decoration: underline;
		text-underline-offset: 3px;
		color: #f4f4f5;
	}

	.coverage-highlight {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
