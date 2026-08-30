<script lang="ts">
	import { buildProgressionGroupShares } from "../../shared/progressionGroupShare.js";
	import type { SongCoverageEntry } from "../../define-chord-progression/compute-coverage-of-all-songs/index.js";

	type Props = {
		songCoverages: SongCoverageEntry[];
		selectedGroupLabel: string | null;
		selectedProgressionName: string | null;
		onSelectGroup: (label: string | null) => void;
		onSelectProgression: (name: string | null) => void;
	};

	const {
		songCoverages,
		selectedGroupLabel,
		selectedProgressionName,
		onSelectGroup,
		onSelectProgression
	}: Props = $props();

	const GROUP_COLOR_LEGEND_TITLE = "color = core group blend";

	const GROUP_COLOR_LEGEND_EXPLANATION =
		"Each matched core progression adds its occurrence count to the group it belongs to; a song's dot blends the legend colors in proportion to those group totals, so a 50/50 song fades evenly between two colors. Gap-fill progressions belong to no group and never count, so a song whose only matches are gap fills stays grey.";

	const LEGEND_MAX_HEIGHT = "40vh";
	const PERCENT_WHOLE_THRESHOLD = 1;
	const SUB_ONE_PERCENT_DECIMAL_PLACES = 2;

	const sortedLegendItems = $derived(buildProgressionGroupShares(songCoverages));

	const formatShareAsPercent = (sharePercent: number): string => {
		if (sharePercent === 0) {
			return "0%";
		}

		if (sharePercent < PERCENT_WHOLE_THRESHOLD) {
			const rounded = sharePercent.toFixed(SUB_ONE_PERCENT_DECIMAL_PLACES);
			return `${rounded.slice(rounded.indexOf("."))}%`;
		}

		return `${Math.round(sharePercent)}%`;
	};

	const handleGroupClick = (label: string) => {
		onSelectGroup(selectedGroupLabel === label ? null : label);
	};

	const handleProgressionClick = (name: string) => {
		onSelectProgression(selectedProgressionName === name ? null : name);
	};
</script>

<div class="legend" style:--legend-max-height={LEGEND_MAX_HEIGHT}>
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
	{#each sortedLegendItems as item (item.label)}
		{@const isExpandable = item.progressions.length > 0}
		{@const isSelected = selectedGroupLabel === item.label}
		<div class="legend-group">
			{#if isExpandable}
				<button
					class="legend-item legend-item-button"
					class:legend-item-selected={isSelected}
					type="button"
					aria-expanded={isSelected}
					onclick={() => handleGroupClick(item.label)}
				>
					<span class="legend-dot" style:background={item.color}></span>
					<span class="legend-share">{formatShareAsPercent(item.sharePercent)}</span>
					<span class="legend-label">{item.label}</span>
				</button>
			{:else}
				<div class="legend-item">
					<span class="legend-dot" style:background={item.color}></span>
					<span class="legend-share">{formatShareAsPercent(item.sharePercent)}</span>
					<span class="legend-label">{item.label}</span>
				</div>
			{/if}
			{#if isSelected}
				<ul class="legend-children">
					{#each item.progressions as progression (progression.name)}
						{@const isProgressionSelected = selectedProgressionName === progression.name}
						<li class="legend-child">
							<button
								class="legend-child-button"
								class:legend-child-selected={isProgressionSelected}
								type="button"
								onclick={() => handleProgressionClick(progression.name)}
							>
								<span class="legend-share"
									>{formatShareAsPercent(progression.sharePercent)}</span
								>
								<span class="legend-child-label">{progression.name}</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
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
		max-width: 16rem;
		max-height: var(--legend-max-height);
		overflow-y: auto;
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

	.legend-group {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.6rem;
		color: #a1a1aa;
		text-align: left;
	}

	.legend-item-button {
		pointer-events: auto;
		width: 100%;
		padding: 0;
		border: none;
		background: transparent;
		font-family: inherit;
		cursor: pointer;
	}

	.legend-item-button:hover .legend-label,
	.legend-item-button:focus-visible .legend-label {
		color: #e4e4e7;
	}

	.legend-item-selected .legend-label {
		color: #f4f4f5;
	}

	.legend-item-selected .legend-share {
		color: #a1a1aa;
	}

	.legend-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.legend-share {
		flex-shrink: 0;
		min-width: 2.5rem;
		color: #71717a;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.legend-label {
		min-width: 0;
		color: #a1a1aa;
	}

	.legend-children {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		margin: 0;
		padding: 0 0 0 1rem;
		list-style: none;
	}

	.legend-child {
		display: flex;
		align-items: center;
	}

	.legend-child-button {
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.0625rem 0;
		border: none;
		background: transparent;
		font-family: inherit;
		font-size: 0.55rem;
		color: #71717a;
		line-height: 1.35;
		text-align: left;
		cursor: pointer;
		border-radius: 0.1875rem;
	}

	.legend-child-button:hover .legend-child-label,
	.legend-child-button:focus-visible .legend-child-label {
		color: #d4d4d8;
	}

	.legend-child-selected .legend-child-label {
		color: #e4e4e7;
	}

	.legend-child-selected .legend-share {
		color: #a1a1aa;
	}

	.legend-child-label {
		min-width: 0;
	}
</style>
