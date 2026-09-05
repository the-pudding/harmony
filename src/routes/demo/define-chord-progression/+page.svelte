<script lang="ts">
	import coreProgressionsData from "$data/core-progressions.js";
	import type { CoreProgression } from "$data/core-progressions.js";
	import { siblingVariantsForProgression } from "$data/core-progressions.util.js";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import SongSelectDropdown from "./components/SongSelectDropdown.svelte";
	import FinalAnnotatedSong from "./components/FinalAnnotatedSong.svelte";
	import CodeReference from "./components/CodeReference.svelte";
	import CollapsiblePanel from "./components/CollapsiblePanel.svelte";
	import CoreProgressionRow from "./components/CoreProgressionRow.svelte";
	import SongCoverageBeeswarm from "./components/SongCoverageBeeswarm.svelte";
	import { createAllSongsCoverageState } from "./compute-coverage-of-all-songs/createAllSongsCoverageState.svelte.js";
	import type { ChordAnnotation } from "./progression-matching-logic/progressionMatchAnalysis.js";
	import { matchSongV2 } from "../match-algo-v2/match-algo-v2-logic/matchSongV2.js";
	import { DEFAULT_WEIGHTS } from "../match-algo-v2/match-algo-v2-logic/weights.js";
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import { findGroupedSongByKey } from "../../../data/songBrowserData.js";
	import DefineChordProgressionUrlSync from "./DefineChordProgressionUrlSync.svelte";
	import { EXPLAINED_THRESHOLD_PERCENT } from "./constants.js";

	const coverage = createAllSongsCoverageState();

	let titleFilter = $state("");
	let selectedKey = $state("");
	let pinnedForSong = $state<{ songKey: string; progression: string } | null>(
		null
	);
	let showSongsContext = $state(false);
	const coreProgressions: CoreProgression[] = coreProgressionsData;

	const baseList = $derived(coverage.baseList);

	const songByKey = $derived(
		new Map(baseList.map((song) => [song.songKey, song]))
	);

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
		findGroupedSongByKey(coverage.songs, selectedKey)
	);

	const allSongsCoverageResult = $derived(coverage.allSongsCoverageResult);

	const v2Result = $derived(
		selectedSong
			? matchSongV2(selectedSong, coreProgressions, DEFAULT_WEIGHTS)
			: null
	);

	const explainedPercent = $derived(v2Result?.explainedPercent ?? 0);

	const finalMatches = $derived(v2Result?.matches ?? []);

	const pinnedProgression = $derived(
		pinnedForSong !== null && pinnedForSong.songKey === selectedKey
			? pinnedForSong.progression
			: null
	);

	const pinnedProgressionVariants = $derived(
		pinnedProgression
			? siblingVariantsForProgression(coreProgressions, pinnedProgression)
			: null
	);

	const songAnnotations = $derived<ChordAnnotation[]>(
		v2Result?.annotations ?? []
	);

	function handleSongSelect(songKey: string) {
		selectedKey = songKey;
	}

	function handleProgressionSelect(chordProgression: string) {
		const siblings = siblingVariantsForProgression(
			coreProgressions,
			chordProgression
		);
		pinnedForSong =
			pinnedProgression !== null && siblings.includes(pinnedProgression)
				? null
				: { songKey: selectedKey, progression: chordProgression };
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
	<DefineChordProgressionUrlSync
		songsReady={!coverage.loading && coverage.songs.length > 0}
		songs={coverage.songs}
		{baseList}
		bind:selectedKey
		bind:showSongsContext
	/>
	<TopNavBar showSearch={false} />

	<div class="content">
		<h1 class="page-title">
			Section-first tiling with weighted heuristics, preferring named
			<CodeReference filename="core-progressions.ts" />
			when they fit how a musician would read the chart.
		</h1>

		{#if coverage.loading}
			<p class="dataset-status">Loading song dataset…</p>
		{:else if coverage.loadError}
			<p class="dataset-status error">{coverage.loadError}</p>
		{/if}

		{#if baseList.length > 0}
			<section class="step-section">
				<h2 class="section-heading">
					Pick an example song to see how the algorithm works on it
				</h2>

				<CollapsiblePanel
					expandLabel="How well the algorithm is doing across all songs?"
					collapseLabel="How well the algorithm is doing across all songs?"
					bind:expanded={showSongsContext}
				>
					<div class="section-description">
						match % measured based on if the progression ultimately was deemed a
						chord progression in the song (not just if it appeared at all)
					</div>
					<CoreProgressionRow
						{coreProgressions}
						selectedSong={selectedSong ?? null}
						activeProgression={pinnedProgression}
						progressionMatchCounts={allSongsCoverageResult?.progressionMatchCounts ??
							null}
						songCoverages={allSongsCoverageResult?.songCoverages ?? null}
						totalSongCount={allSongsCoverageResult?.songCoverages.length ?? 0}
						onselect={handleProgressionSelect}
					/>

					<SongCoverageBeeswarm
						songs={allSongsCoverageResult?.songCoverages ?? null}
						{songByKey}
						selectedSongKey={selectedKey}
						highlightedProgressions={pinnedProgressionVariants}
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
						Here are the final chord progressions selected for this song, which
						cover <span class="coverage-highlight"
							>{explainedPercent}%{explainedPercent >
							EXPLAINED_THRESHOLD_PERCENT
								? " ✅"
								: " 😔"}</span
						> of all chords
					</h2>

					<FinalAnnotatedSong
						song={selectedSong}
						matches={finalMatches}
						annotations={songAnnotations}
						{explainedPercent}
						activeProgression={pinnedProgression}
						onselect={handleProgressionSelect}
					/>
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

	.coverage-highlight {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>
