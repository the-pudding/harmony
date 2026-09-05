<script lang="ts">
	import { onDestroy, onMount, untrack } from "svelte";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import WeightSliders from "./components/WeightSliders.svelte";
	import ScoreBreakdown from "./components/ScoreBreakdown.svelte";
	import SongComparisonSlide from "./components/SongComparisonSlide.svelte";
	import ViewTabs from "./components/ViewTabs.svelte";
	import OverviewPanel from "./components/OverviewPanel.svelte";
	import MatchAlgoV2UrlSync from "./MatchAlgoV2UrlSync.svelte";
	import { getCachedV2MatchResult } from "./match-algo-v2-logic/matchResultCache.js";
	import { createAlgoComparisonState } from "./match-algo-v2-logic/createAlgoComparisonState.svelte.js";
	import {
		DEFAULT_WEIGHTS,
		type MatchWeights
	} from "./match-algo-v2-logic/weights.js";
	import { trickySongsToMatchCorrectly } from "../../../data/hand-reviewed-songs.js";
	import {
		fetchGroupedAllSongs,
		findGroupedSongByKey
	} from "../../../data/songBrowserData.js";
	import type { GroupedSong } from "../../../data/songBrowser.js";
	import coreProgressionsData from "$data/core-progressions.js";
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import { currentSearchParams } from "../shared/currentSearchParams.js";
	import {
		MATCH_ALGO_V2_TAB_OVERVIEW,
		MATCH_ALGO_V2_TAB_TRICKY,
		readMatchAlgoV2UrlState,
		type MatchAlgoV2Tab
	} from "./matchAlgoV2UrlParams.js";

	const CONTENT_MAX_WIDTH_REM = 80;
	const PAGE_HORIZONTAL_PADDING_REM = 1.5;
	const PEEK_WIDTH_REM = 7;
	const SLIDE_GAP_REM = 1.25;
	const SONG_INDEX_STEP = 1;
	const INTERACTIVE_KEY_TARGETS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

	const initialUrl = readMatchAlgoV2UrlState(currentSearchParams());
	const comparisonState = createAlgoComparisonState();

	let allSongs = $state<GroupedSong[]>([]);
	let loading = $state(true);
	let loadError = $state<string | null>(null);
	let weights = $state<MatchWeights>({ ...DEFAULT_WEIGHTS });
	let selectedKey = $state(initialUrl.song);
	let tab = $state<MatchAlgoV2Tab>(initialUrl.tab);

	const reviewSongs = $derived(
		trickySongsToMatchCorrectly.flatMap((entry) => {
			const song = findGroupedSongByKey(allSongs, entry.id);
			return song ? [song] : [];
		})
	);

	const extraSelectedSong = $derived(
		reviewSongs.some((song) => song.songKey === selectedKey)
			? null
			: findGroupedSongByKey(allSongs, selectedKey)
	);

	const carouselSongs = $derived(
		extraSelectedSong ? [...reviewSongs, extraSelectedSong] : reviewSongs
	);

	const selectedIndex = $derived(
		Math.max(
			0,
			carouselSongs.findIndex((song) => song.songKey === selectedKey)
		)
	);

	const selectedSong = $derived(carouselSongs[selectedIndex] ?? null);

	const canGoPrevious = $derived(selectedIndex > 0);
	const canGoNext = $derived(selectedIndex < carouselSongs.length - 1);

	const showTricky = $derived(tab === MATCH_ALGO_V2_TAB_TRICKY);
	const showOverview = $derived(tab === MATCH_ALGO_V2_TAB_OVERVIEW);

	const v2Result = $derived(
		selectedSong
			? getCachedV2MatchResult(selectedSong, coreProgressionsData, weights)
			: null
	);

	$effect(() => {
		if (!showOverview || allSongs.length === 0) return;
		const songs = allSongs;
		const currentWeights = weights;
		untrack(() => {
			void comparisonState.compute(
				songs,
				coreProgressionsData,
				currentWeights
			);
		});
	});

	onMount(async () => {
		try {
			allSongs = await fetchGroupedAllSongs();
		} catch (e) {
			loadError = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	});

	onDestroy(() => {
		comparisonState.cancel();
	});

	const handleWeightsChange = (newWeights: MatchWeights) => {
		weights = newWeights;
	};

	const selectSongAt = (index: number) => {
		const song = carouselSongs[index];
		if (!song) return;
		selectedKey = song.songKey;
	};

	const goBy = (delta: number) => {
		selectSongAt(selectedIndex + delta);
	};

	const openTrickySong = (songKey: string) => {
		if (!findGroupedSongByKey(allSongs, songKey)) return;
		selectedKey = songKey;
		tab = MATCH_ALGO_V2_TAB_TRICKY;
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (!showTricky) return;
		const target = event.target;
		if (
			target instanceof HTMLElement &&
			(INTERACTIVE_KEY_TARGETS.has(target.tagName) || target.isContentEditable)
		) {
			return;
		}
		if (event.key === "ArrowRight" && canGoNext) {
			event.preventDefault();
			goBy(SONG_INDEX_STEP);
		}
		if (event.key === "ArrowLeft" && canGoPrevious) {
			event.preventDefault();
			goBy(-SONG_INDEX_STEP);
		}
	};
</script>

<svelte:head>
	<title>harmony — match algo v2</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
	/>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div
	class="page"
	style="--top-nav-height: {TOP_NAV_HEIGHT}; --content-max-width: {CONTENT_MAX_WIDTH_REM}rem; --page-padding: {PAGE_HORIZONTAL_PADDING_REM}rem; --peek-width: {PEEK_WIDTH_REM}rem; --slide-gap: {SLIDE_GAP_REM}rem; --active-index: {selectedIndex};"
>
	<TopNavBar showSearch={false} />

	<div class="content">
		<h1 class="page-title">match algo v2</h1>
		<p class="page-subtitle">
			Section-first tiling: pick the best repeating unit from the start of each
			section, score it with a weighted blend of musician-like heuristics,
			recurse on any tail. Tune the weights below and swipe through tricky songs
			with the arrow keys.
		</p>

		<section class="controls-section">
			<h2 class="section-heading">algorithm weights</h2>
			<WeightSliders {weights} onchange={handleWeightsChange} />
			<div class="weight-legend">
				<span class="legend-item"
					><span class="legend-swatch" style="background:#76b7b2"></span>core</span
				>
				<span class="legend-item"
					><span class="legend-swatch" style="background:#4e79a7"></span>length</span
				>
				<span class="legend-item"
					><span class="legend-swatch" style="background:#59a14f"></span>start</span
				>
				<span class="legend-item"
					><span class="legend-swatch" style="background:#f28e2c"></span>end</span
				>
				<span class="legend-item"
					><span class="legend-swatch" style="background:#b07aa1"></span>repeat</span
				>
			</div>
		</section>

		<ViewTabs {tab} onselect={(next) => (tab = next)} />

		{#if loading}
			<p class="status">loading songs…</p>
		{:else if loadError}
			<p class="status error">{loadError}</p>
		{:else if carouselSongs.length === 0}
			<p class="status">no songs found in the dataset</p>
		{:else if showTricky}
			<p class="v1-note">
				v2 tiles from the start of each section and scores candidate loops with
				weighted heuristics — core, length, section start/end, and contiguous
				repeats — instead of greedily maximizing coverage.
			</p>

			<div class="carousel-chrome">
				<button
					type="button"
					class="nav-btn"
					onclick={() => goBy(-SONG_INDEX_STEP)}
					disabled={!canGoPrevious}
					aria-label="Previous song"
				>
					←
				</button>
				<p class="song-index">
					{selectedIndex + 1} / {carouselSongs.length}
				</p>
				<button
					type="button"
					class="nav-btn"
					onclick={() => goBy(SONG_INDEX_STEP)}
					disabled={!canGoNext}
					aria-label="Next song"
				>
					→
				</button>
			</div>
		{/if}
	</div>

	{#if !loading && !loadError && carouselSongs.length > 0 && showTricky}
		<div
			class="carousel-bleed"
			id="match-algo-panel-tricky"
			role="tabpanel"
			aria-labelledby="match-algo-tab-tricky"
		>
			<div class="carousel-viewport">
				<div class="carousel-track">
					{#each carouselSongs as song, index (song.songKey)}
						<div class="carousel-slide">
							<SongComparisonSlide
								{song}
								{weights}
								interactive={index === selectedIndex}
							/>
						</div>
					{/each}
				</div>
				{#if canGoNext}
					<button
						type="button"
						class="peek-hit"
						onclick={() => goBy(SONG_INDEX_STEP)}
						aria-label="Next song"
					></button>
					<div class="peek-fade" aria-hidden="true"></div>
				{/if}
			</div>
		</div>
	{/if}

	{#if !loading && !loadError && showOverview}
		<div
			class="content"
			id="match-algo-panel-overview"
			role="tabpanel"
			aria-labelledby="match-algo-tab-overview"
		>
			<OverviewPanel
				comparison={comparisonState.comparison}
				pairs={comparisonState.pairs}
				isComputing={comparisonState.isComputing}
				progressPercent={comparisonState.progressPercent}
				computedCount={comparisonState.computedCount}
				totalCount={comparisonState.totalCount}
				songs={allSongs}
				{weights}
				onSelectSong={openTrickySong}
			/>
		</div>
	{/if}

	{#if showTricky && selectedSong && v2Result}
		<div class="content">
			<section class="step-section">
				<h3 class="step-label">score breakdown</h3>
				<div class="breakdown-grid">
					{#each v2Result.sectionResults as sectionResult (sectionResult.sectionIndex)}
						<ScoreBreakdown
							sectionLabel={selectedSong.sections[sectionResult.sectionIndex]
								.label}
							spans={sectionResult.spans}
							{weights}
						/>
					{/each}
				</div>
			</section>
		</div>
	{/if}
</div>

<MatchAlgoV2UrlSync
	ready={!loading && allSongs.length > 0}
	knownSongKeys={allSongs.map((song) => song.songKey)}
	bind:tab
	bind:selectedKey
/>

<style>
	:global(body > header) {
		display: none;
	}

	.page {
		min-height: 100vh;
		padding-top: var(--top-nav-height);
		background: #09090b;
		color: #f4f4f5;
		font-family: "JetBrains Mono", monospace;
		--content-gutter: max(
			var(--page-padding),
			calc((100vw - var(--content-max-width)) / 2 + var(--page-padding))
		);
		--slide-width: min(
			calc(var(--content-max-width) - 2 * var(--page-padding)),
			calc(100vw - var(--content-gutter) - var(--peek-width))
		);
		--peek-region-width: calc(
			100vw - var(--content-gutter) - var(--slide-width)
		);
	}

	.content {
		max-width: var(--content-max-width);
		margin: 0 auto;
		padding: 2rem var(--page-padding) 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.page-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: #f4f4f5;
		margin: 0;
		letter-spacing: -0.02em;
	}

	.page-subtitle {
		margin: -1.25rem 0 0;
		font-size: 0.8rem;
		color: #71717a;
		line-height: 1.55;
	}

	.section-heading {
		margin: 0 0 0.75rem;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #71717a;
	}

	.controls-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.weight-legend {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.6rem;
		color: #71717a;
	}

	.legend-swatch {
		width: 10px;
		height: 10px;
		border-radius: 2px;
		display: inline-block;
		opacity: 0.85;
	}

	.status {
		color: #71717a;
		font-size: 0.8rem;
	}

	.status.error {
		color: #f87171;
	}

	.v1-note {
		font-size: 0.72rem;
		color: #71717a;
		line-height: 1.5;
		margin: 0;
		padding: 0.5rem 0.75rem;
		border-left: 3px solid #3f3f46;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 0 0.25rem 0.25rem 0;
	}

	.carousel-chrome {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}

	.nav-btn {
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 9999px;
		border: 1px solid #3f3f46;
		background: #18181b;
		color: #e4e4e7;
		font-size: 1rem;
		font-family: inherit;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s,
			opacity 0.15s;
	}

	.nav-btn:hover:not(:disabled) {
		background: #27272a;
		border-color: #52525b;
	}

	.nav-btn:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.song-index {
		margin: 0;
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		color: #71717a;
		min-width: 4.5rem;
		text-align: center;
	}

	.carousel-bleed {
		width: 100vw;
		margin-left: calc(50% - 50vw);
		overflow: hidden;
	}

	.carousel-viewport {
		position: relative;
		overflow: hidden;
	}

	.carousel-track {
		display: flex;
		gap: var(--slide-gap);
		padding-left: var(--content-gutter);
		padding-right: var(--peek-width);
		padding-bottom: 1.5rem;
		transform: translateX(
			calc(-1 * var(--active-index) * (var(--slide-width) + var(--slide-gap)))
		);
		transition: transform 0.35s ease;
	}

	.carousel-slide {
		flex: 0 0 var(--slide-width);
		min-width: 0;
	}

	.peek-fade {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: var(--peek-region-width);
		pointer-events: none;
		background: linear-gradient(
			to right,
			rgba(9, 9, 11, 0) 0%,
			rgba(9, 9, 11, 0.45) 35%,
			#09090b 88%
		);
	}

	.peek-hit {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: var(--peek-region-width);
		border: none;
		padding: 0;
		background: transparent;
		cursor: pointer;
		z-index: 1;
	}

	.step-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid #27272a;
		border-radius: 0.5rem;
		background: #0c0c0e;
	}

	.step-label {
		margin: 0;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #a1a1aa;
	}

	.breakdown-grid {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
