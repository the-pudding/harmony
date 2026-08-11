<script lang="ts">
	import {
		allProgressionGroups,
		progressionGroupLegendItems,
		UNGROUPED_PROGRESSION_GROUP_LABEL
	} from "$data/core-progressions.js";
	import {
		chordProgressionVariants,
		dominantProgressionGroupName
	} from "$data/core-progressions.util.js";
	import type { SongCoverageEntry } from "../../define-chord-progression/compute-coverage-of-all-songs/index.js";

	type Props = {
		songCoverages: SongCoverageEntry[];
	};

	const { songCoverages }: Props = $props();

	const GROUP_COLOR_LEGEND_TITLE = "color = top core group";

	const GROUP_COLOR_LEGEND_EXPLANATION =
		"Each matched core progression adds its occurrence count to the group it belongs to; the group with the highest total colors the song. Gap-fill progressions belong to no group and never count, so a song whose only matches are gap fills stays grey.";

	const PERCENT_SCALE = 100;
	const LEGEND_MAX_HEIGHT = "40vh";

	const songShareByGroupLabel = $derived.by(() => {
		const songCount = songCoverages.length;
		if (songCount === 0) {
			return new Map<string, number>();
		}

		const countsByLabel = songCoverages.reduce((counts, entry) => {
			const groupName = dominantProgressionGroupName(entry.progressionCounts);
			const label = groupName ?? UNGROUPED_PROGRESSION_GROUP_LABEL;
			return new Map([
				...counts,
				[label, (counts.get(label) ?? 0) + 1]
			]);
		}, new Map<string, number>());

		return new Map(
			[...countsByLabel.entries()].map(([label, count]) => [
				label,
				count / songCount
			])
		);
	});

	const songShareByProgressionName = $derived.by(() => {
		const songCount = songCoverages.length;
		if (songCount === 0) {
			return new Map<string, number>();
		}

		const matchedVariantKeysBySong = songCoverages.map(
			(entry) =>
				new Set(
					entry.progressionCounts.map((count) => count.chordProgression)
				)
		);

		return new Map(
			allProgressionGroups.flatMap((group) =>
				group.progressions.map((progression) => {
					const variants = new Set(
						chordProgressionVariants(progression.chordProgression)
					);
					const matchingSongCount = matchedVariantKeysBySong.filter(
						(matchedVariants) =>
							[...variants].some((variant) => matchedVariants.has(variant))
					).length;
					return [progression.name, matchingSongCount / songCount] as const;
				})
			)
		);
	});

	const sortedChildProgressionsByGroupName = $derived(
		new Map(
			allProgressionGroups.map((group) => [
				group.name,
				[...group.progressions].sort((first, second) => {
					const shareDelta =
						(songShareByProgressionName.get(second.name) ?? 0) -
						(songShareByProgressionName.get(first.name) ?? 0);
					return shareDelta !== 0
						? shareDelta
						: first.name.localeCompare(second.name);
				})
			])
		)
	);

	const sortedLegendItems = $derived(
		[...progressionGroupLegendItems].sort((first, second) => {
			const shareDelta =
				(songShareByGroupLabel.get(second.label) ?? 0) -
				(songShareByGroupLabel.get(first.label) ?? 0);
			return shareDelta !== 0
				? shareDelta
				: first.label.localeCompare(second.label);
		})
	);

	let expandedGroupLabels = $state(new Set<string>());

	const formatShareAsPercent = (share: number): string =>
		`${Math.round(share * PERCENT_SCALE)}%`;

	const toggleGroupExpanded = (label: string) => {
		expandedGroupLabels = expandedGroupLabels.has(label)
			? new Set([...expandedGroupLabels].filter((item) => item !== label))
			: new Set([...expandedGroupLabels, label]);
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
		{@const childProgressions =
			sortedChildProgressionsByGroupName.get(item.label) ?? []}
		{@const isExpandable = childProgressions.length > 0}
		{@const isExpanded = expandedGroupLabels.has(item.label)}
		{@const share = songShareByGroupLabel.get(item.label) ?? 0}
		<div class="legend-group">
			{#if isExpandable}
				<button
					class="legend-item legend-item-button"
					type="button"
					aria-expanded={isExpanded}
					onclick={() => toggleGroupExpanded(item.label)}
				>
					<span class="legend-dot" style:background={item.color}></span>
					<span class="legend-share">{formatShareAsPercent(share)}</span>
					<span class="legend-label">{item.label}</span>
				</button>
			{:else}
				<div class="legend-item">
					<span class="legend-dot" style:background={item.color}></span>
					<span class="legend-share">{formatShareAsPercent(share)}</span>
					<span class="legend-label">{item.label}</span>
				</div>
			{/if}
			{#if isExpanded}
				<ul class="legend-children">
					{#each childProgressions as progression (progression.name)}
						{@const progressionShare =
							songShareByProgressionName.get(progression.name) ?? 0}
						<li class="legend-child">
							<span class="legend-share"
								>{formatShareAsPercent(progressionShare)}</span
							>
							<span class="legend-child-label">{progression.name}</span>
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

	.legend-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.legend-share {
		flex-shrink: 0;
		min-width: 1.75rem;
		color: #71717a;
		font-variant-numeric: tabular-nums;
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
		gap: 0.5rem;
		font-size: 0.55rem;
		color: #71717a;
		line-height: 1.35;
	}

	.legend-child-label {
		min-width: 0;
	}
</style>
