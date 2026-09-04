<script lang="ts">
  import type { TileSpan } from "../match-algo-v2-logic/tileSection.js";
  import type { ScoredTile } from "../match-algo-v2-logic/score.js";
  import type { MatchWeights } from "../match-algo-v2-logic/weights.js";

  type Props = {
    sectionLabel: string | null;
    spans: TileSpan[];
    weights: MatchWeights;
  };

  const { sectionLabel, spans, weights }: Props = $props();

  const FEATURE_LABELS: Record<string, string> = {
    core: "core",
    length: "len",
    sectionStart: "start",
    sectionEnd: "end",
    contiguousRepeat: "repeat",
  };

  const FEATURE_COLORS: Record<string, string> = {
    core: "#76b7b2",
    length: "#4e79a7",
    sectionStart: "#59a14f",
    sectionEnd: "#f28e2c",
    contiguousRepeat: "#b07aa1",
  };

  const featureKeys = ["core", "length", "sectionStart", "sectionEnd", "contiguousRepeat"] as const;

  const maxScore = $derived(
    Math.max(
      ...spans.flatMap((span) => [
        span.tile.totalScore,
        ...span.rejectedAtSameStart.map((r) => r.totalScore),
      ]),
      0.1
    )
  );

  let expandedStartIndices = $state(new Set<number>());

  const toggleExpanded = (startIndex: number) => {
    expandedStartIndices = expandedStartIndices.has(startIndex)
      ? new Set([...expandedStartIndices].filter((i) => i !== startIndex))
      : new Set([...expandedStartIndices, startIndex]);
  };
</script>

<div class="breakdown">
  {#if sectionLabel}
    <div class="section-label">{sectionLabel}</div>
  {/if}

  {#each spans as span (span.tile.tile.startIndex)}
    {@const winner = span.tile}
    {@const rejected = span.rejectedAtSameStart}

    <div class="tile-block">
      <div class="tile-row winner">
        <span class="roman">{winner.tile.unitRomanString}</span>
        {#if winner.tile.isCore}
          <span class="core-badge">{winner.tile.coreName ?? "core"}</span>
        {/if}
        <span class="score-total">{winner.totalScore.toFixed(2)}</span>
        <div class="feature-bars">
          {#each featureKeys as key}
            {@const contribution = winner.weightedContributions[key]}
            <span
              class="feature-bar"
              style="width: {Math.max(2, (contribution / maxScore) * 60)}px; background: {FEATURE_COLORS[key]};"
              title="{FEATURE_LABELS[key]}: feature={winner.featureValues[key].toFixed(2)}, w={weights[key].toFixed(1)}, contrib={contribution.toFixed(2)}"
            ></span>
          {/each}
        </div>
        <span class="pos-info">×{winner.tile.repeatCount}{winner.tile.prefixLeftoverLength > 0 ? "+" : ""} [{winner.tile.startIndex}–{winner.tile.startIndex + winner.tile.coveredLength + winner.tile.prefixLeftoverLength - 1}]</span>
        {#if rejected.length > 0}
          <button
            class="expand-btn"
            onclick={() => toggleExpanded(winner.tile.startIndex)}
            type="button"
          >
            {expandedStartIndices.has(winner.tile.startIndex) ? "▲" : "▼"} {rejected.length} other{rejected.length === 1 ? "" : "s"}
          </button>
        {/if}
      </div>

      {#if expandedStartIndices.has(winner.tile.startIndex)}
        {#each rejected.sort((a, b) => b.totalScore - a.totalScore) as alt (alt.tile.unitRomanString)}
          <div class="tile-row rejected">
            <span class="roman muted">{alt.tile.unitRomanString}</span>
            <span class="score-total muted">{alt.totalScore.toFixed(2)}</span>
            <div class="feature-bars">
              {#each featureKeys as key}
                {@const contribution = alt.weightedContributions[key]}
                <span
                  class="feature-bar muted"
                  style="width: {Math.max(2, (contribution / maxScore) * 60)}px; background: {FEATURE_COLORS[key]};"
                  title="{FEATURE_LABELS[key]}: feature={alt.featureValues[key].toFixed(2)}, w={weights[key].toFixed(1)}, contrib={contribution.toFixed(2)}"
                ></span>
              {/each}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/each}

  {#if spans.length === 0}
    <div class="empty">no tiles — section has fewer than 3 chords</div>
  {/if}
</div>

<style>
  .breakdown {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.75rem;
  }

  .section-label {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #71717a;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid #27272a;
    margin-bottom: 0.125rem;
  }

  .tile-block {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .tile-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.2rem 0.375rem;
    border-radius: 0.25rem;
  }

  .tile-row.winner {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid #3f3f46;
  }

  .tile-row.rejected {
    padding-left: 0.75rem;
    border-left: 2px solid #27272a;
    margin-left: 0.5rem;
    opacity: 0.6;
  }

  .roman {
    font-family: inherit;
    color: #e4e4e7;
    min-width: 10rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.75rem;
  }

  .roman.muted {
    color: #71717a;
  }

  .core-badge {
    font-size: 0.55rem;
    padding: 0.1rem 0.3rem;
    background: rgba(78, 121, 167, 0.2);
    border: 1px solid rgba(78, 121, 167, 0.4);
    border-radius: 0.25rem;
    color: #93c5fd;
    white-space: nowrap;
    max-width: 8rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .score-total {
    font-size: 0.7rem;
    font-weight: 600;
    color: rgba(165, 180, 252, 0.9);
    min-width: 2.5rem;
    text-align: right;
  }

  .score-total.muted {
    color: #71717a;
  }

  .feature-bars {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }

  .feature-bar {
    height: 10px;
    border-radius: 2px;
    display: inline-block;
    opacity: 0.85;
    cursor: help;
  }

  .feature-bar.muted {
    opacity: 0.4;
  }

  .pos-info {
    font-size: 0.6rem;
    color: #52525b;
    white-space: nowrap;
  }

  .expand-btn {
    font-size: 0.6rem;
    font-family: inherit;
    color: #71717a;
    background: transparent;
    border: none;
    cursor: pointer;
    white-space: nowrap;
    padding: 0.1rem 0.2rem;
  }

  .expand-btn:hover {
    color: #a1a1aa;
  }

  .empty {
    color: #52525b;
    font-size: 0.7rem;
    font-style: italic;
    padding: 0.25rem 0;
  }
</style>
