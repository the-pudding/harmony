<script lang="ts">
	import type { YearDomain } from "../../shared/artists/artistStats.js";
	import type { ClusterSummary } from "../embedding/clustering/clusterSummaries.js";
	import ClusterSummaryRow from "./ClusterSummaryRow.svelte";

	type Props = {
		summaries: ClusterSummary[];
		hiddenClusterHashes: Set<string>;
		yearDomain: YearDomain | null;
		selectedSongKey: string | null;
		rankByClusterHash: Map<string, number>;
		showGlobalToggle?: boolean;
		onSelectAllClusters?: () => void;
		onDeselectAllClusters?: () => void;
		onToggleClusterVisibility: (clusterHash: string) => void;
		onSelectSong: (songKey: string) => void;
	};

	const {
		summaries,
		hiddenClusterHashes,
		yearDomain,
		selectedSongKey,
		rankByClusterHash,
		showGlobalToggle = false,
		onSelectAllClusters,
		onDeselectAllClusters,
		onToggleClusterVisibility,
		onSelectSong
	}: Props = $props();

	const isClusterVisible = (clusterHash: string): boolean =>
		!hiddenClusterHashes.has(clusterHash);

	const allClustersSelected = $derived(
		summaries.length > 0 &&
			summaries.every((summary) => !hiddenClusterHashes.has(summary.cluster.hash))
	);
</script>

{#if showGlobalToggle && onSelectAllClusters && onDeselectAllClusters}
	<div class="global-toggle-row">
		<button
			class="global-toggle"
			type="button"
			onclick={() =>
				allClustersSelected ? onDeselectAllClusters() : onSelectAllClusters()}
		>
			{allClustersSelected ? "deselect all" : "select all"}
		</button>
	</div>
{/if}

<ul class="cluster-list">
	{#each summaries as summary (summary.cluster.hash)}
		<ClusterSummaryRow
			{summary}
			visible={isClusterVisible(summary.cluster.hash)}
			rank={rankByClusterHash.get(summary.cluster.hash)}
			{yearDomain}
			{selectedSongKey}
			{onToggleClusterVisibility}
			{onSelectSong}
		/>
	{/each}
</ul>

<style>
	.global-toggle-row {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding-bottom: 0.625rem;
		border-bottom: 1px solid rgba(63, 63, 70, 0.7);
	}

	.global-toggle {
		font-family: inherit;
		font-size: 0.65rem;
		color: #a1a1aa;
		padding: 0.1875rem 0.625rem;
		border-radius: 9999px;
		border: 1px solid rgba(63, 63, 70, 0.8);
		background: rgba(9, 9, 11, 0.6);
		cursor: pointer;
	}

	.global-toggle:hover {
		color: #e4e4e7;
		border-color: rgba(113, 113, 122, 0.9);
	}

	.cluster-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
</style>
