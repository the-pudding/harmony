<script lang="ts">
  import { onMount } from "svelte";
  import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
  import FinalAnnotatedSong from "../define-chord-progression/components/FinalAnnotatedSong.svelte";
  import WeightSliders from "./components/WeightSliders.svelte";
  import ScoreBreakdown from "./components/ScoreBreakdown.svelte";
  import HandReviewedSongList from "./components/HandReviewedSongList.svelte";
  import {
    matchSongV2,
    type MatchAlgoV2Result,
  } from "./match-algo-v2-logic/matchSongV2.js";
  import {
    selectFinalProgressions,
    buildFinalChordAnnotations,
  } from "../define-chord-progression/progression-matching-logic/finalProgressionSelection.js";
  import {
    findStrictSubsetKeys,
    applySubsetFlag,
  } from "../define-chord-progression/progression-matching-logic/strictSubsetProgressions.js";
  import { DEFAULT_WEIGHTS, type MatchWeights } from "./match-algo-v2-logic/weights.js";
  import { trickySongsToMatchCorrectly } from "../../../data/hand-reviewed-songs.js";
  import { fetchGroupedAllSongs, findGroupedSongByKey } from "../../../data/songBrowserData.js";
  import type { GroupedSong } from "../../../data/songBrowser.js";
  import coreProgressionsData from "$data/core-progressions.js";
  import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";

  const CONTENT_MAX_WIDTH_REM = 80;

  let allSongs = $state<GroupedSong[]>([]);
  let loading = $state(true);
  let loadError = $state<string | null>(null);
  let weights = $state<MatchWeights>({ ...DEFAULT_WEIGHTS });
  let selectedKey = $state("");
  let pinnedV1Progression = $state<string | null>(null);
  let pinnedV2Progression = $state<string | null>(null);

  onMount(async () => {
    try {
      allSongs = await fetchGroupedAllSongs();
    } catch (e) {
      loadError = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }

    const songParam = new URL(window.location.href).searchParams.get("song");
    if (songParam && allSongs.some((s) => s.songKey === songParam)) {
      selectedKey = songParam;
    }
  });

  const selectedSong = $derived(
    selectedKey ? findGroupedSongByKey(allSongs, selectedKey) : null
  );

  const v2Result = $derived.by((): MatchAlgoV2Result | null => {
    if (!selectedSong) return null;
    return matchSongV2(selectedSong, coreProgressionsData, weights);
  });

  const v1Selection = $derived(
    selectedSong
      ? selectFinalProgressions(selectedSong, coreProgressionsData)
      : null
  );

  const v1StrictSubsetKeys = $derived(
    v1Selection
      ? findStrictSubsetKeys([
          ...v1Selection.coreMatches,
          ...v1Selection.gapCandidates,
        ])
      : new Set<string>()
  );

  const v1CoreSelected = $derived(
    v1Selection
      ? applySubsetFlag(v1Selection.coreSelected, v1StrictSubsetKeys)
      : []
  );

  const v1GapSelected = $derived(
    v1Selection
      ? applySubsetFlag(v1Selection.gapSelected, v1StrictSubsetKeys)
      : []
  );

  const v1Matches = $derived([...v1CoreSelected, ...v1GapSelected]);

  const v1Annotations = $derived(
    selectedSong && v1Selection
      ? buildFinalChordAnnotations(selectedSong, {
          coreSelected: v1CoreSelected,
          gapSelected: v1GapSelected,
        })
      : []
  );

  const v1ExplainedPercent = $derived(v1Selection?.explainedPercent ?? 0);

  const handleWeightsChange = (newWeights: MatchWeights) => {
    weights = newWeights;
  };

  const handleSongSelect = (songKey: string) => {
    selectedKey = songKey;
    pinnedV1Progression = null;
    pinnedV2Progression = null;
    const url = new URL(window.location.href);
    url.searchParams.set("song", songKey);
    history.replaceState(null, "", url.toString());
  };

  const togglePinned = (
    current: string | null,
    chordProgression: string
  ): string | null =>
    current === chordProgression ? null : chordProgression;
</script>

<svelte:head>
  <title>harmony — match algo v2</title>
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
  />
</svelte:head>

<div
  class="page"
  style="--top-nav-height: {TOP_NAV_HEIGHT}; --content-max-width: {CONTENT_MAX_WIDTH_REM}rem;"
>
  <TopNavBar showSearch={false} />

  <div class="content">
    <h1 class="page-title">match algo v2</h1>
    <p class="page-subtitle">
      Section-first tiling: pick the best repeating unit from the start of each section, score it
      with a weighted blend of musician-like heuristics, recurse on any tail. Tune the weights
      below and test against hand-reviewed songs.
    </p>

    <section class="controls-section">
      <h2 class="section-heading">algorithm weights</h2>
      <WeightSliders {weights} onchange={handleWeightsChange} />
      <div class="weight-legend">
        <span class="legend-item"><span class="legend-swatch" style="background:#76b7b2"></span>core</span>
        <span class="legend-item"><span class="legend-swatch" style="background:#4e79a7"></span>length</span>
        <span class="legend-item"><span class="legend-swatch" style="background:#59a14f"></span>start</span>
        <span class="legend-item"><span class="legend-swatch" style="background:#f28e2c"></span>end</span>
        <span class="legend-item"><span class="legend-swatch" style="background:#b07aa1"></span>repeat</span>
      </div>
    </section>

    {#if loading}
      <p class="status">loading songs…</p>
    {:else if loadError}
      <p class="status error">{loadError}</p>
    {:else}
      <section class="song-list-section">
        <h2 class="section-heading">hand-reviewed songs</h2>
        <HandReviewedSongList
          trickySongs={trickySongsToMatchCorrectly}
          {selectedKey}
          onselect={handleSongSelect}
        />
      </section>

      {#if selectedSong && v2Result}
        <div class="song-result">
          <h2 class="result-heading">
            {selectedSong.title}
            <span class="artist">{selectedSong.artists.join(", ")}</span>
          </h2>

          <p class="v1-note">
            v1 greedily maximizes coverage with hard gates — at least two occurrences,
            length 3–6, back-to-back repeats for short cores, and a 5% section-start
            tie-break. That cherry-picks windows a musician would never group: a 6-chord
            fragment from mid-section, or a 3-chord core that covers more chords than the
            4-chord loop the section actually is. v2 tiles from the start of each section
            and scores those loops instead.
          </p>

          <div class="comparison-columns">
            <section class="comparison-column">
              <div class="step-header">
                <h3 class="step-label">v1</h3>
                <span class="coverage-badge">{v1ExplainedPercent}% explained</span>
              </div>
              <FinalAnnotatedSong
                compact
                showMetadata={false}
                song={selectedSong}
                matches={v1Matches}
                annotations={v1Annotations}
                explainedPercent={v1ExplainedPercent}
                activeProgression={pinnedV1Progression}
                onselect={(chordProgression) => {
                  pinnedV1Progression = togglePinned(
                    pinnedV1Progression,
                    chordProgression
                  );
                }}
              />
            </section>
            <section class="comparison-column">
              <div class="step-header">
                <h3 class="step-label">v2</h3>
                <span class="coverage-badge">{v2Result.explainedPercent}% explained</span>
              </div>
              <FinalAnnotatedSong
                compact
                showMetadata={false}
                song={selectedSong}
                matches={v2Result.matches}
                annotations={v2Result.annotations}
                explainedPercent={v2Result.explainedPercent}
                activeProgression={pinnedV2Progression}
                onselect={(chordProgression) => {
                  pinnedV2Progression = togglePinned(
                    pinnedV2Progression,
                    chordProgression
                  );
                }}
              />
            </section>
          </div>

          <section class="step-section">
            <h3 class="step-label">score breakdown</h3>
            <div class="breakdown-grid">
              {#each v2Result.sectionResults as sectionResult (sectionResult.sectionIndex)}
                <ScoreBreakdown
                  sectionLabel={selectedSong.sections[sectionResult.sectionIndex].label}
                  spans={sectionResult.spans}
                  {weights}
                />
              {/each}
            </div>
          </section>
        </div>
      {/if}
    {/if}
  </div>
</div>

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
  }

  .content {
    max-width: var(--content-max-width);
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
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

  .song-list-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .song-result {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .result-heading {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #f4f4f5;
    display: flex;
    align-items: baseline;
    gap: 0.625rem;
  }

  .artist {
    font-size: 0.75rem;
    font-weight: 400;
    color: #71717a;
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

  .step-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .step-label {
    margin: 0;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #a1a1aa;
  }

  .coverage-badge {
    font-size: 0.65rem;
    font-weight: 600;
    padding: 0.1rem 0.4rem;
    border-radius: 0.25rem;
    background: rgba(99, 102, 241, 0.15);
    border: 1px solid rgba(99, 102, 241, 0.3);
    color: rgba(165, 180, 252, 0.9);
  }

  .breakdown-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
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

  .comparison-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
    align-items: start;
  }

  .comparison-column {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 0;
    padding: 1rem;
    border: 1px solid #27272a;
    border-radius: 0.5rem;
    background: #0c0c0e;
  }

  @media (max-width: 56rem) {
    .comparison-columns {
      grid-template-columns: 1fr;
    }
  }
</style>
