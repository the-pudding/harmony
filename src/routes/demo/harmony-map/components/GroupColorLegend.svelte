<script lang="ts">
	import { progressionGroupLegendItems } from "$data/core-progressions.js";

	const GROUP_COLOR_LEGEND_TITLE = "color = top core group";

	const GROUP_COLOR_LEGEND_EXPLANATION =
		"Each matched core progression adds its occurrence count to the group it belongs to; the group with the highest total colors the song. Gap-fill progressions belong to no group and never count, so a song whose only matches are gap fills stays grey.";
</script>

<div class="legend">
	<div class="legend-header">
		<span class="legend-title">{GROUP_COLOR_LEGEND_TITLE}</span>
		<button
			class="legend-info"
			type="button"
			aria-label={GROUP_COLOR_LEGEND_EXPLANATION}
		>
			<span aria-hidden="true">i</span>
			<span class="legend-info-tooltip" aria-hidden="true"
				>{GROUP_COLOR_LEGEND_EXPLANATION}</span
			>
		</button>
	</div>
	{#each progressionGroupLegendItems as item (item.label)}
		<div class="legend-item">
			<span class="legend-dot" style:background={item.color}></span>
			<span>{item.label}</span>
		</div>
	{/each}
</div>

<style>
	.legend {
		position: absolute;
		bottom: 0.75rem;
		left: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		background: rgba(9, 9, 11, 0.75);
		border: 1px solid rgba(63, 63, 70, 0.6);
		border-radius: 0.375rem;
		padding: 0.5rem 0.75rem;
		pointer-events: none;
		max-width: 14rem;
	}

	.legend-header {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding-bottom: 0.25rem;
		margin-bottom: 0.125rem;
		border-bottom: 1px solid rgba(63, 63, 70, 0.6);
	}

	.legend-title {
		font-size: 0.6rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #a1a1aa;
	}

	.legend-info {
		position: relative;
		pointer-events: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 0.875rem;
		height: 0.875rem;
		padding: 0;
		border-radius: 50%;
		border: 1px solid rgba(113, 113, 122, 0.8);
		background: transparent;
		color: #a1a1aa;
		font-family: inherit;
		font-size: 0.55rem;
		font-style: italic;
		cursor: help;
	}

	.legend-info:hover,
	.legend-info:focus-visible {
		color: #f4f4f5;
		border-color: rgba(161, 161, 170, 0.9);
	}

	.legend-info-tooltip {
		position: absolute;
		bottom: calc(100% + 0.5rem);
		left: 0;
		width: 16rem;
		padding: 0.5rem 0.625rem;
		border-radius: 0.375rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		background: rgba(9, 9, 11, 0.98);
		color: #d4d4d8;
		font-size: 0.65rem;
		font-style: normal;
		line-height: 1.5;
		text-transform: none;
		letter-spacing: normal;
		opacity: 0;
		visibility: hidden;
		transition:
			opacity 0.15s ease,
			visibility 0.15s ease;
	}

	.legend-info:hover .legend-info-tooltip,
	.legend-info:focus-visible .legend-info-tooltip {
		opacity: 1;
		visibility: visible;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.6rem;
		color: #a1a1aa;
	}

	.legend-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}
</style>
