<script lang="ts">
	import type { ArtistProgressionStat } from "./artistStats.js";

	const PERCENT_DECIMALS = 0;

	type Props = {
		progressions: ArtistProgressionStat[];
		limit: number;
		highlightedProgressions?: string[] | null;
		onSelectProgression?: (chordProgression: string) => void;
	};

	const {
		progressions,
		limit,
		highlightedProgressions = null,
		onSelectProgression
	}: Props = $props();

	const shown = $derived(progressions.slice(0, limit));

	const maxSongCount = $derived(
		shown.reduce((largest, stat) => Math.max(largest, stat.songCount), 0)
	);

	const fillPercent = (songCount: number): number =>
		maxSongCount === 0 ? 0 : (songCount / maxSongCount) * 100;

	const isHighlighted = (chordProgression: string): boolean =>
		highlightedProgressions?.includes(chordProgression) ?? false;
</script>

{#if shown.length === 0}
	<p class="empty">No core progressions matched.</p>
{:else}
	<ul class="progressions">
		{#each shown as stat (stat.chordProgression)}
			<li>
				<button
					class="progression"
					class:progression-highlighted={isHighlighted(stat.chordProgression)}
					class:progression-static={onSelectProgression === undefined}
					disabled={onSelectProgression === undefined}
					onclick={() => onSelectProgression?.(stat.chordProgression)}
				>
					<span class="head">
						<span class="chords">{stat.chordProgression}</span>
						<span class="count">
							{stat.songCount} · {stat.sharePercent.toFixed(PERCENT_DECIMALS)}%
						</span>
					</span>
					<span class="name">{stat.name}</span>
					<span class="bar" aria-hidden="true">
						<span
							class="fill"
							style:width="{fillPercent(stat.songCount)}%"
							style:background={stat.color}
						></span>
					</span>
				</button>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.progressions {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.progression {
		display: flex;
		flex-direction: column;
		gap: 0.1875rem;
		width: 100%;
		padding: 0.25rem 0.375rem;
		border: 1px solid transparent;
		border-radius: 0.25rem;
		background: transparent;
		color: inherit;
		font-family: inherit;
		text-align: left;
		cursor: pointer;
	}

	.progression-static {
		cursor: default;
	}

	.progression:not(.progression-static):hover {
		background: rgba(99, 102, 241, 0.14);
	}

	.progression-highlighted {
		border-color: rgba(99, 102, 241, 0.6);
		background: rgba(99, 102, 241, 0.14);
	}

	.head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.chords {
		font-size: 0.7rem;
		color: #e4e4e7;
	}

	.count {
		font-size: 0.65rem;
		color: #71717a;
		flex-shrink: 0;
	}

	.name {
		font-size: 0.6rem;
		color: #71717a;
		line-height: 1.4;
	}

	.bar {
		display: block;
		height: 0.25rem;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}

	.fill {
		display: block;
		height: 100%;
	}

	.empty {
		margin: 0;
		font-size: 0.7rem;
		color: #71717a;
	}
</style>
