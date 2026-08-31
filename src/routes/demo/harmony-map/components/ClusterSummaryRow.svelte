<script lang="ts">
	import SongReleaseTimeline from "../../define-chord-progression/components/SongReleaseTimeline.svelte";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import type { YearDomain } from "../../shared/artists/artistStats.js";
	import type { ClusterSummary } from "../embedding/clustering/clusterSummaries.js";
	import { colorForGroupName } from "../progressionGroupColors.js";

	type Props = {
		summary: ClusterSummary;
		visible: boolean;
		rank: number | undefined;
		name?: string | null;
		yearDomain: YearDomain | null;
		selectedSongKey: string | null;
		songByKey: Map<string, GroupedSong>;
		onToggleClusterVisibility: (clusterHash: string) => void;
		onSelectSong: (songKey: string) => void;
	};

	const {
		summary,
		visible,
		rank,
		name = null,
		yearDomain,
		selectedSongKey,
		songByKey,
		onToggleClusterVisibility,
		onSelectSong
	}: Props = $props();

	const songCountLabel = $derived(`${summary.songCount.toLocaleString()} songs`);
	const title = $derived(name ? `${name} - ${songCountLabel}` : songCountLabel);
</script>

<li class="cluster-row" class:cluster-row-hidden={!visible}>
	<button
		class="visibility-toggle"
		type="button"
		aria-pressed={visible}
		aria-label={visible ? "Hide cluster on map" : "Show cluster on map"}
		onclick={() => onToggleClusterVisibility(summary.cluster.hash)}
	>
		{visible ? "◉" : "○"}
	</button>

	<div class="cluster-body">
		<div class="cluster-header">
			<span class="cluster-rank">#{rank ?? "?"}</span>
			<span class="cluster-title">{title}</span>
		</div>

		{#if summary.groupShares.length > 0}
			<div class="group-blend-bar" aria-label="Core group blend for cluster">
				{#each summary.groupShares as groupShare (groupShare.groupName)}
					<span
						class="group-blend-segment"
						style:width="{groupShare.share * 100}%"
						style:background={colorForGroupName(groupShare.groupName)}
						title="{groupShare.groupName} · {Math.round(groupShare.share * 100)}%"
					></span>
				{/each}
			</div>
			<div class="cluster-meta">
				<span class="dominant-group">{summary.dominantGroupName ?? "ungrouped"}</span>
			</div>
		{:else}
			<p class="cluster-meta cluster-meta-muted">no core group matches</p>
		{/if}

		<SongReleaseTimeline
			songs={summary.timelineSongs}
			{songByKey}
			selectedSongKey={selectedSongKey ?? ""}
			colorByProgressionGroup
			{yearDomain}
			{onSelectSong}
		/>
	</div>
</li>

<style>
	.cluster-row {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		padding: 0.5rem;
		border-radius: 0.375rem;
		border: 1px solid rgba(63, 63, 70, 0.55);
		background: rgba(9, 9, 11, 0.35);
	}

	.cluster-row-hidden {
		opacity: 0.55;
	}

	.visibility-toggle {
		flex-shrink: 0;
		width: 1.25rem;
		height: 1.25rem;
		padding: 0;
		border: none;
		background: transparent;
		color: #a1a1aa;
		font-size: 0.85rem;
		line-height: 1;
		cursor: pointer;
	}

	.visibility-toggle:hover {
		color: #f4f4f5;
	}

	.cluster-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.cluster-header {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.cluster-rank {
		font-size: 0.65rem;
		font-weight: 600;
		color: #71717a;
	}

	.cluster-title {
		font-weight: 600;
		color: #f4f4f5;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.group-blend-bar {
		display: flex;
		width: 100%;
		height: 0.375rem;
		border-radius: 9999px;
		overflow: hidden;
		background: rgba(63, 63, 70, 0.6);
	}

	.group-blend-segment {
		display: block;
		height: 100%;
		min-width: 1px;
	}

	.cluster-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.65rem;
		color: #a1a1aa;
	}

	.cluster-meta-muted {
		margin: 0;
	}

	.dominant-group {
		color: #d4d4d8;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
