<script lang="ts">
	import coreProgressionsData, {
		BACK_TO_BACK_REPEAT
	} from "$data/core-progressions.js";
	import type { CoreProgression } from "$data/core-progressions.js";
	import { siblingVariantsForProgression } from "$data/core-progressions.util.js";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import SongSelectDropdown from "./components/SongSelectDropdown.svelte";
	import ProgressionMatchTable from "./components/ProgressionMatchTable.svelte";
	import FinalAnnotatedSong from "./components/FinalAnnotatedSong.svelte";
	import ProgressionDefinitionCriteriaTable from "./components/ProgressionDefinitionCriteriaTable.svelte";
	import type { SongBiasOverride } from "./compute-coverage-of-all-songs/index.js";
	import CodeReference from "./components/CodeReference.svelte";
	import CollapsiblePanel from "./components/CollapsiblePanel.svelte";
	import CoreProgressionRow from "./components/CoreProgressionRow.svelte";
	import SongCoverageBeeswarm from "./components/SongCoverageBeeswarm.svelte";
	import { createAllSongsCoverageState } from "./compute-coverage-of-all-songs/createAllSongsCoverageState.svelte.js";
	import { MIN_PROGRESSION_OCCURRENCES } from "./progression-matching-logic/progressionMatchAnalysis.js";
	import { PREFER_SECTION_START_MAX_COVERAGE_SACRIFICE_PERCENT } from "./progression-matching-logic/greedyProgressionSelection.js";
	import {
		MIN_PROGRESSION_LENGTH,
		MAX_PROGRESSION_LENGTH
	} from "./progression-matching-logic/progressionConstraints.js";
	import type { ChordAnnotation } from "./progression-matching-logic/progressionMatchAnalysis.js";
	import {
		selectFinalProgressions,
		buildFinalChordAnnotations
	} from "./progression-matching-logic/finalProgressionSelection.js";
	import {
		findStrictSubsetKeys,
		applySubsetFlag
	} from "./progression-matching-logic/strictSubsetProgressions.js";
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import { findGroupedSongByKey } from "../../../data/songBrowserData.js";
	import DefineChordProgressionUrlSync from "./DefineChordProgressionUrlSync.svelte";
	import { EXPLAINED_THRESHOLD_PERCENT } from "./constants.js";

	const coverage = createAllSongsCoverageState();

	let titleFilter = $state("");
	let selectedKey = $state("");
	let pinnedProgression = $state<string | null>(null);
	let showSongsContext = $state(false);
	const coreProgressions: CoreProgression[] = coreProgressionsData;

	const baseList = $derived(coverage.baseList);

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

	const GREEDY_SORT_LABEL = `most still-unclaimed chords covered first — but within ${PREFER_SECTION_START_MAX_COVERAGE_SACRIFICE_PERCENT}% coverage, prefer progressions that start more sections (length as final tiebreaker)`;

	const allSongsCoverageResult = $derived(coverage.allSongsCoverageResult);
	const corpusBiasOverrides = $derived<SongBiasOverride[]>(
		allSongsCoverageResult?.biasOverrides ?? []
	);

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

	const finalMatches = $derived([
		...flaggedCoreSelected,
		...flaggedGapSelected
	]);

	const pinnedProgressionVariants = $derived(
		pinnedProgression
			? siblingVariantsForProgression(coreProgressions, pinnedProgression)
			: null
	);

	const songAnnotations = $derived<ChordAnnotation[]>(
		selectedSong ? buildFinalChordAnnotations(selectedSong, finalSelection) : []
	);

	$effect(() => {
		selectedKey;
		pinnedProgression = null;
	});

	function handleSongSelect(songKey: string) {
		selectedKey = songKey;
	}

	function handleProgressionSelect(chordProgression: string) {
		const siblings = siblingVariantsForProgression(
			coreProgressions,
			chordProgression
		);
		pinnedProgression =
			pinnedProgression !== null && siblings.includes(pinnedProgression)
				? null
				: chordProgression;
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
			A. What defines a chord progression? B. Given there are many possible ways
			to slice a song, what algorithm do we apply to maximize coverage but also
			prioritize our predefined <CodeReference
				filename="core-progressions.ts"
			/>?
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
					<ProgressionDefinitionCriteriaTable
						biasOverrides={corpusBiasOverrides}
					/>
				</CollapsiblePanel>

				<h3 class="walkthrough-heading">WALKTHROUGH OF ALGORITHM</h3>

				<section class="step-section">
					<h2 class="section-heading">
						1. Greedily select core-progressions that appear at least <span
							class="const-value">{MIN_PROGRESSION_OCCURRENCES}</span
						>
						times (or just once if it fills an entire section), by {GREEDY_SORT_LABEL}
					</h2>
					<p class="section-description">
						Being "greedy" with core-progressions incentivizes us to really
						expand the coverage of
						<CodeReference filename="core-progressions.ts" />. Selection happens
						one instance at a time rather than all-or-nothing: after each pick
						we re-score every remaining candidate against the chords that are
						still free, so a progression that owns a whole chorus still claims
						it even when one stray instance elsewhere collides with an earlier
						winner. It just forfeits the colliding instance. The occurrence bar
						is then re-checked against whatever survived, so a progression left
						with a single leftover fragment is dropped rather than credited for
						it. The single-occurrence exception only applies to core
						progressions — not gap-fill candidates — to avoid spuriously
						claiming any section with no other matches. Short core progressions
						carry an extra bar: a
						<span class="const-value">{MIN_PROGRESSION_LENGTH}</span>-chord
						shape turns up twice somewhere in almost any song by coincidence, so
						those entries also need at least
						<span class="const-value">{BACK_TO_BACK_REPEAT}</span> occurrences
						sitting immediately back-to-back — proof of a real loop rather than
						two unrelated sightings. Within the
						<span class="const-value"
							>{PREFER_SECTION_START_MAX_COVERAGE_SACRIFICE_PERCENT}%</span
						> tolerance, we bias toward progressions that begin at the start of a
						section, since the vast majority of real progressions do — this avoids
						stranding the first chord of a section when a slightly longer match happens
						to skip it.
					</p>

					{#if flaggedCoreMatches.length > 0}
						<ProgressionMatchTable
							matches={flaggedCoreSelected}
							allMatches={flaggedCoreMatches}
							song={selectedSong}
							activeProgression={pinnedProgression}
							onselect={handleProgressionSelect}
							showUnselectedRows={true}
						/>
					{:else}
						<p class="list-meta">No core progressions matched this song.</p>
					{/if}
				</section>

				<section class="step-section">
					<h2 class="section-heading">
						2. Look for any other recurring progressions in the gaps not
						occupied by core-progressions, selecting them greedily by {GREEDY_SORT_LABEL}
					</h2>
					<p class="section-description">
						Among chords not yet covered by core progressions, we look for
						progressions of
						<span class="const-value">{MIN_PROGRESSION_LENGTH}</span>–<span
							class="const-value">{MAX_PROGRESSION_LENGTH}</span
						>
						chords that recur at least twice as complete instances lying entirely
						inside the gaps. This stage uses the same instance-at-a-time greedy pass
						as step 1, so gap progressions are pairwise non-overlapping — no chord
						position is ever claimed by more than one progression — while still keeping
						the instances that do fit. A valid progression cannot consist of consecutive
						<span class="const-value">{MIN_PROGRESSION_LENGTH}</span>+
						progressions repeating more than once. Within the
						<span class="const-value"
							>{PREFER_SECTION_START_MAX_COVERAGE_SACRIFICE_PERCENT}%</span
						> tolerance, gap progressions that start at an uncovered section boundary
						are also preferred.
					</p>

					{#if flaggedGapCandidates.length > 0}
						<ProgressionMatchTable
							matches={flaggedGapSelected}
							allMatches={flaggedGapCandidates}
							song={selectedSong}
							activeProgression={pinnedProgression}
							onselect={handleProgressionSelect}
							showUnselectedRows={true}
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
