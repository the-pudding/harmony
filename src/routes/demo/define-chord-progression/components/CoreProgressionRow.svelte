<script lang="ts">
	import type { CoreProgression } from "$data/core-progressions.js";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import { buildCoreProgressionDisplayMatches } from "../progression-matching-logic/progressionMatchAnalysis.js";
	import { matchOutline } from "./progressionColors.js";
	import ProgressionMatchButton from "./ProgressionMatchButton.svelte";
	import GlobalProgressionStats from "./progression-match-stats/GlobalProgressionStats.svelte";
	import {
		CORE_PROGRESSION_ROW_BUTTON_WIDTH_REM,
		CORE_PROGRESSION_ROW_GAP_REM
	} from "./progressionTableLayout.js";

	type Props = {
		coreProgressions: CoreProgression[];
		selectedSong: GroupedSong | null;
		activeProgression: string | null;
		progressionMatchRates: Record<string, number> | null;
		progressionMatchCounts: Record<string, number> | null;
		onselect: (chordProgression: string) => void;
	};

	let {
		coreProgressions,
		selectedSong,
		activeProgression,
		progressionMatchRates,
		progressionMatchCounts,
		onselect
	}: Props = $props();

	const displayMatches = $derived.by(() => {
		const matches = buildCoreProgressionDisplayMatches(
			coreProgressions,
			selectedSong
		);
		if (!progressionMatchRates) return matches;
		return [...matches].sort(
			(a, b) =>
				(progressionMatchRates[b.chordProgression] ?? 0) -
				(progressionMatchRates[a.chordProgression] ?? 0)
		);
	});
</script>

<div
	class="core-progression-row"
	style="--core-progression-button-width: {CORE_PROGRESSION_ROW_BUTTON_WIDTH_REM}rem; --core-progression-row-gap: {CORE_PROGRESSION_ROW_GAP_REM}rem;"
>
	{#each displayMatches as match (match.chordProgression)}
		{@const outline = matchOutline(match)}
		{@const matchRate = progressionMatchRates?.[match.chordProgression] ?? 0}
		{@const matchingSongCount =
			progressionMatchCounts?.[match.chordProgression] ?? 0}
		<div class="core-progression-row-item">
			<ProgressionMatchButton
				{match}
				active={activeProgression === match.chordProgression}
				borderColor={outline.color}
				dashed={outline.dashed}
				{onselect}
			>
				{#snippet stats({ active })}
					<GlobalProgressionStats
						matchRatePercent={matchRate}
						{matchingSongCount}
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
