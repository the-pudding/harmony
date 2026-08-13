<script lang="ts">
	import { buildProgressionGroupShares } from "./progressionGroupShare.js";
	import type { SongCoverageEntry } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";

	type Props = {
		songCoverages: readonly SongCoverageEntry[];
	};

	const { songCoverages }: Props = $props();

	const groups = $derived(buildProgressionGroupShares(songCoverages));

	const formatPercent = (value: number): string => `${Math.round(value)}%`;
</script>

<div class="breakdown">
	{#each groups as group (group.label)}
		{@const presentProgressions = group.progressions.filter(
			(progression) => progression.songCount > 0
		)}
		<div class="family">
			<div class="family-row">
				<span class="family-dot" style:background={group.color}></span>
				<span class="family-label">{group.label}</span>
				<span class="family-bar-track">
					<span
						class="family-bar-fill"
						style:width="{Math.min(group.sharePercent, 100)}%"
						style:background={group.color}
					></span>
				</span>
				<span class="family-share">{formatPercent(group.sharePercent)}</span>
				<span class="family-count">({group.songCount.toLocaleString()})</span>
			</div>

			{#if presentProgressions.length > 0}
				<ul class="progression-list">
					{#each presentProgressions as progression (progression.name)}
						<li class="progression-row">
							<span class="progression-name">{progression.name}</span>
							<span class="progression-bar-track">
								<span
									class="progression-bar-fill"
									style:width="{Math.min(progression.sharePercent, 100)}%"
									style:background={group.color}
								></span>
							</span>
							<span class="progression-share"
								>{formatPercent(progression.sharePercent)}</span
							>
							<span class="progression-count">({progression.songCount})</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/each}
</div>

<style>
	.breakdown {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.family {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.family-row {
		display: grid;
		grid-template-columns: 0.625rem 14rem 1fr 2.5rem auto;
		align-items: center;
		gap: 0.5rem;
	}

	.family-dot {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.family-label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: #f4f4f5;
	}

	.family-bar-track {
		height: 0.5rem;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.06);
		overflow: hidden;
	}

	.family-bar-fill {
		display: block;
		height: 100%;
		border-radius: inherit;
		opacity: 0.9;
	}

	.family-share {
		font-size: 0.8125rem;
		font-weight: 600;
		color: #f4f4f5;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.family-count {
		font-size: 0.6875rem;
		color: #71717a;
		font-variant-numeric: tabular-nums;
	}

	.progression-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin: 0;
		padding: 0 0 0 1.125rem;
		list-style: none;
	}

	.progression-row {
		display: grid;
		grid-template-columns: 13rem 1fr 2.25rem auto;
		align-items: center;
		gap: 0.5rem;
	}

	.progression-name {
		font-size: 0.7rem;
		color: #a1a1aa;
	}

	.progression-bar-track {
		height: 0.3125rem;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.05);
		overflow: hidden;
	}

	.progression-bar-fill {
		display: block;
		height: 100%;
		border-radius: inherit;
		opacity: 0.65;
	}

	.progression-share {
		font-size: 0.7rem;
		color: #d4d4d8;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.progression-count {
		font-size: 0.625rem;
		color: #52525b;
		font-variant-numeric: tabular-nums;
	}
</style>
