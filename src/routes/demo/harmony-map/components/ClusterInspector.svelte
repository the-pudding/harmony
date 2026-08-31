<script lang="ts">
	import type { YearDomain } from "../../shared/artists/artistStats.js";
	import type { ClusterSummary } from "../embedding/clustering/clusterSummaries.js";
	import ClusterSummaryList from "./ClusterSummaryList.svelte";

	type Props = {
		summaries: ClusterSummary[];
		clustersAvailable: boolean;
		hiddenClusterHashes: Set<string>;
		yearDomain: YearDomain | null;
		selectedSongKey: string | null;
		rankByClusterHash: Map<string, number>;
		onSelectAllClusters: () => void;
		onDeselectAllClusters: () => void;
		onToggleClusterVisibility: (clusterHash: string) => void;
		onSelectSong: (songKey: string) => void;
	};

	const {
		summaries,
		clustersAvailable,
		hiddenClusterHashes,
		yearDomain,
		selectedSongKey,
		rankByClusterHash,
		onSelectAllClusters,
		onDeselectAllClusters,
		onToggleClusterVisibility,
		onSelectSong
	}: Props = $props();
</script>

<div class="cluster-inspector">
	{#if !clustersAvailable}
		<p class="hint">
			Density clusters are only available for UMAP-driven layouts (not 3D w/
			time or hand-designed axes).
		</p>
	{:else if summaries.length === 0}
		<p class="hint">No dense clusters found in the current song set.</p>
	{:else}
		<ClusterSummaryList
			{summaries}
			{hiddenClusterHashes}
			{yearDomain}
			{selectedSongKey}
			{rankByClusterHash}
			showGlobalToggle
			{onSelectAllClusters}
			{onDeselectAllClusters}
			{onToggleClusterVisibility}
			{onSelectSong}
		/>
	{/if}
</div>

<style>
	.cluster-inspector {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		height: 100%;
		overflow-y: auto;
		padding: 0.875rem;
		box-sizing: border-box;
		background: rgba(24, 24, 27, 0.55);
		border: 1px solid rgba(63, 63, 70, 0.7);
		border-radius: 0.5rem;
		font-size: 0.75rem;
		color: #d4d4d8;
	}

	.hint {
		margin: 0;
		color: #71717a;
		line-height: 1.5;
	}
</style>
