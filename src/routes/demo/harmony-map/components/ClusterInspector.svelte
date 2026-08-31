<script lang="ts">
	import type { ClusterSummary } from "../embedding/clustering/clusterSummaries.js";
	import { colorForGroupName } from "../progressionGroupColors.js";

	type Props = {
		summaries: ClusterSummary[];
		clustersAvailable: boolean;
		hiddenClusterHashes: Set<string>;
		onSelectAllClusters: () => void;
		onDeselectAllClusters: () => void;
		onToggleClusterVisibility: (clusterHash: string) => void;
	};

	const {
		summaries,
		clustersAvailable,
		hiddenClusterHashes,
		onSelectAllClusters,
		onDeselectAllClusters,
		onToggleClusterVisibility
	}: Props = $props();

	const formatYearRange = (summary: ClusterSummary): string => {
		if (summary.yearRange === null) return "year —";
		if (summary.yearRange.min === summary.yearRange.max) {
			return String(summary.yearRange.min);
		}
		return `${summary.yearRange.min}–${summary.yearRange.max}`;
	};

	const isClusterVisible = (clusterHash: string): boolean =>
		!hiddenClusterHashes.has(clusterHash);

	const allClustersSelected = $derived(
		summaries.length > 0 &&
			summaries.every((summary) => !hiddenClusterHashes.has(summary.cluster.hash))
	);
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

		<ul class="cluster-list">
			{#each summaries as summary, index (summary.cluster.hash)}
				{@const visible = isClusterVisible(summary.cluster.hash)}
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
							<span class="cluster-rank">#{index + 1}</span>
							<span class="cluster-count"
								>{summary.songCount.toLocaleString()} songs</span
							>
							<span class="cluster-years">{formatYearRange(summary)}</span>
						</div>

						{#if summary.groupShares.length > 0}
							<div
								class="group-blend-bar"
								aria-label="Core group blend for cluster"
							>
								{#each summary.groupShares as groupShare (groupShare.groupName)}
									<span
										class="group-blend-segment"
										style:width="{groupShare.share * 100}%"
										style:background={colorForGroupName(groupShare.groupName)}
										title="{groupShare.groupName} · {Math.round(
											groupShare.share * 100
										)}%"
									></span>
								{/each}
							</div>
							<div class="cluster-meta">
								<span class="dominant-group"
									>{summary.dominantGroupName ?? "ungrouped"}</span
								>
								{#if summary.medianYear !== null}
									<span class="median-year"
										>median {Math.round(summary.medianYear)}</span
									>
								{/if}
							</div>
						{:else}
							<p class="cluster-meta cluster-meta-muted">no core group matches</p>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
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

	.cluster-count {
		font-weight: 600;
		color: #f4f4f5;
	}

	.cluster-years {
		margin-left: auto;
		font-size: 0.65rem;
		color: #71717a;
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
		justify-content: space-between;
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

	.median-year {
		flex-shrink: 0;
		color: #71717a;
	}
</style>
