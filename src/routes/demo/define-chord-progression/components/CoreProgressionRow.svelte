<script lang="ts">
	import type { CoreProgression } from "$data/core-progressions.js";
	import { chordProgressionVariants } from "$data/core-progressions.util.js";
	import {
		aggregateVariantMatchStats,
		buildCoreProgressionDisplayMatches,
		type ProgressionWithMatchStats,
		type SongProgressionMatchList
	} from "../progression-matching-logic/progressionMatchAnalysis.js";
	import { matchOutline } from "./progressionColors.js";
	import ProgressionMatchButton from "./ProgressionMatchButton.svelte";
	import GlobalProgressionStats from "./progression-match-stats/GlobalProgressionStats.svelte";
	import {
		CORE_PROGRESSION_ROW_BUTTON_WIDTH_REM,
		CORE_PROGRESSION_ROW_GAP_REM
	} from "./progressionTableLayout.js";

	type Props = {
		coreProgressions: CoreProgression[];
		selectedSongMatches: ProgressionWithMatchStats[] | null;
		activeProgression: string | null;
		progressionMatchCounts: Record<string, number> | null;
		songCoverages: SongProgressionMatchList[] | null;
		totalSongCount: number;
		onselect: (chordProgression: string) => void;
	};

	let {
		coreProgressions,
		selectedSongMatches,
		activeProgression,
		progressionMatchCounts,
		songCoverages,
		totalSongCount,
		onselect
	}: Props = $props();

	const variantsByName = $derived(
		Object.fromEntries(
			coreProgressions.map((progression) => [
				progression.name,
				chordProgressionVariants(progression.chordProgression)
			])
		) as Record<string, string[]>
	);

	// Aggregate stats (corpus-wide "how many songs match this progression")
	// key on the progression's canonical name, since `songCoverages` reports
	// canonical names rather than literal variant spellings.
	const displayMatches = $derived.by(() => {
		const matches = buildCoreProgressionDisplayMatches(
			coreProgressions,
			selectedSongMatches,
			progressionMatchCounts
		);
		if (!songCoverages) return matches;
		return [...matches].sort((a, b) => {
			const aStats = aggregateVariantMatchStats(
				[a.name],
				songCoverages,
				totalSongCount
			);
			const bStats = aggregateVariantMatchStats(
				[b.name],
				songCoverages,
				totalSongCount
			);
			return bStats.matchRatePercent - aStats.matchRatePercent;
		});
	});

	const variantTooltipRowsFor = (match: {
		name: string;
		chordProgression: string;
	}) =>
		(variantsByName[match.name] ?? [match.chordProgression]).map(
			(chordProgression) => ({
				chordProgression,
				matchingSongCount: progressionMatchCounts?.[chordProgression] ?? 0
			})
		);

	const isActive = (match: {
		name: string;
		chordProgression: string;
	}): boolean =>
		activeProgression !== null &&
		(variantsByName[match.name] ?? [match.chordProgression]).includes(
			activeProgression
		);
</script>

<div
	class="core-progression-row"
	style="--core-progression-button-width: {CORE_PROGRESSION_ROW_BUTTON_WIDTH_REM}rem; --core-progression-row-gap: {CORE_PROGRESSION_ROW_GAP_REM}rem;"
>
	{#each displayMatches as match (match.name)}
		{@const outline = matchOutline(match)}
		{@const variantStats = aggregateVariantMatchStats(
			[match.name],
			songCoverages,
			totalSongCount
		)}
		<div class="core-progression-row-item">
			<ProgressionMatchButton
				{match}
				active={isActive(match)}
				borderColor={outline.color}
				dashed={outline.dashed}
				variantTooltipRows={variantTooltipRowsFor(match)}
				{onselect}
			>
				{#snippet stats({ active })}
					<GlobalProgressionStats
						matchRatePercent={variantStats.matchRatePercent}
						matchingSongCount={variantStats.matchingSongCount}
						{active}
					/>
				{/snippet}
			</ProgressionMatchButton>
		</div>
	{/each}
</div>

<style>
	.core-progression-row {
		display: flex;
		flex-direction: row;
		align-items: stretch;
		gap: var(--core-progression-row-gap);
		overflow-x: auto;
		padding-bottom: 0.125rem;
		scrollbar-width: thin;
		scrollbar-color: rgba(113, 113, 122, 0.5) transparent;
	}

	.core-progression-row-item {
		flex: 0 0 var(--core-progression-button-width);
		min-width: var(--core-progression-button-width);
	}
</style>
