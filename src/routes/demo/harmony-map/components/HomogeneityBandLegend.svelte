<script lang="ts">
	import type {
		HomogeneityBandId,
		HomogeneityBandShare
	} from "../../shared/progressionHomogeneity.js";

	type Props = {
		bandShares: HomogeneityBandShare[];
		selectedBandId: HomogeneityBandId | null;
		onSelectBand: (bandId: HomogeneityBandId | null) => void;
	};

	const { bandShares, selectedBandId, onSelectBand }: Props = $props();

	const handleBandClick = (bandId: HomogeneityBandId) => {
		onSelectBand(selectedBandId === bandId ? null : bandId);
	};
</script>

<div class="band-legend">
	{#each bandShares as { band, sharePercent } (band.id)}
		<button
			class="band-item"
			class:band-item-selected={selectedBandId === band.id}
			class:band-item-dimmed={selectedBandId !== null && selectedBandId !== band.id}
			type="button"
			aria-pressed={selectedBandId === band.id}
			onclick={() => handleBandClick(band.id)}
		>
			<span class="band-dot" style:background={band.color}></span>
			<span class="band-share">{Math.round(sharePercent)}%</span>
			<span class="band-label">{band.label}</span>
		</button>
	{/each}
</div>

<style>
	.band-legend {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		padding-bottom: 0.25rem;
		margin-bottom: 0.125rem;
		border-bottom: 1px solid rgba(63, 63, 70, 0.6);
	}

	.band-item {
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0;
		border: none;
		background: transparent;
		font-family: inherit;
		font-size: 0.6rem;
		color: #a1a1aa;
		text-align: left;
		cursor: pointer;
	}

	.band-item:hover .band-label,
	.band-item:focus-visible .band-label,
	.band-item-selected .band-label {
		color: #f4f4f5;
	}

	.band-item-dimmed {
		opacity: 0.45;
	}

	.band-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.band-share {
		flex-shrink: 0;
		min-width: 2.5rem;
		color: #71717a;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.band-label {
		min-width: 0;
		color: #a1a1aa;
	}
</style>
