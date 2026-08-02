<script lang="ts">
	import { UNGROUPED_PROGRESSION_GROUP_COLOR } from "$data/core-progressions.js";
	import type { ArtistGroupStat } from "./artistStats.js";

	const PERCENT_DECIMALS = 0;

	type Props = {
		groupStats: ArtistGroupStat[];
		songCount: number;
		showLegend?: boolean;
	};

	const { groupStats, songCount, showLegend = true }: Props = $props();

	const groupedSongCount = $derived(
		groupStats.reduce((total, stat) => total + stat.songCount, 0)
	);

	const ungroupedSongCount = $derived(songCount - groupedSongCount);

	const ungroupedSharePercent = $derived(
		songCount === 0 ? 0 : (ungroupedSongCount / songCount) * 100
	);

	const formatPercent = (percent: number): string =>
		`${percent.toFixed(PERCENT_DECIMALS)}%`;
</script>

<div class="group-mix">
	<div class="bar" aria-hidden="true">
		{#each groupStats as stat (stat.groupName)}
			<div
				class="segment"
				style:width="{stat.sharePercent}%"
				style:background={stat.color}
				title="{stat.groupName} — {stat.songCount} songs"
			></div>
		{/each}
		{#if ungroupedSongCount > 0}
			<div
				class="segment"
				style:width="{ungroupedSharePercent}%"
				style:background={UNGROUPED_PROGRESSION_GROUP_COLOR}
				title="no core match — {ungroupedSongCount} songs"
			></div>
		{/if}
	</div>

	{#if showLegend}
		<ul class="legend">
			{#each groupStats as stat (stat.groupName)}
				<li class="legend-item">
					<span class="dot" style:background={stat.color}></span>
					<span class="legend-label">{stat.groupName}</span>
					<span class="legend-value">
						{formatPercent(stat.sharePercent)} · {stat.songCount}
					</span>
				</li>
			{/each}
			{#if ungroupedSongCount > 0}
				<li class="legend-item">
					<span class="dot" style:background={UNGROUPED_PROGRESSION_GROUP_COLOR}
					></span>
					<span class="legend-label">no core match</span>
					<span class="legend-value">
						{formatPercent(ungroupedSharePercent)} · {ungroupedSongCount}
					</span>
				</li>
			{/if}
		</ul>
	{/if}
</div>

<style>
	.group-mix {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.bar {
		display: flex;
		width: 100%;
		height: 0.5rem;
		border-radius: 9999px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.06);
	}

	.segment {
		height: 100%;
	}

	.legend {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.875rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.3125rem;
		font-size: 0.65rem;
		color: #a1a1aa;
	}

	.dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.legend-value {
		color: #71717a;
	}
</style>
