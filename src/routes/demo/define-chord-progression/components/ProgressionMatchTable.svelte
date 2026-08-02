<script lang="ts">
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import type { ProgressionWithMatchStats } from "../progression-matching-logic/progressionMatchAnalysis.js";
	import { matchOutline, NON_SELECTED_PROGRESSION_PALETTE } from "./progressionColors.js";
	import ProgressionMatchButton from "./ProgressionMatchButton.svelte";
	import SongProgressionStats from "./progression-match-stats/SongProgressionStats.svelte";
	import ProgressionMatchScatterPlot from "./ProgressionMatchScatterPlot.svelte";
	import ProgressionMatchSummary from "./ProgressionMatchSummary.svelte";
	import SongChordsDisplay from "./SongChordsDisplay.svelte";
	import {
		BUTTON_COLUMN_WIDTH_PERCENT,
		CHORDS_COLUMN_WIDTH_PERCENT,
		COLUMN_GAP_REM
	} from "./progressionTableLayout.js";

	const MAX_COLLAPSED_RESULTS = 5;

	type Props = {
		matches: ProgressionWithMatchStats[];
		allMatches: ProgressionWithMatchStats[];
		song: GroupedSong;
		activeProgression: string | null;
		onselect: (chordProgression: string) => void;
		showUnselectedRows?: boolean;
	};

	let {
		matches,
		allMatches,
		song,
		activeProgression,
		onselect,
		showUnselectedRows = false
	}: Props = $props();

	let showAll = $state(false);

	const selectedKeys = $derived(new Set(matches.map((m) => m.chordProgression)));
	const tableRows = $derived(showUnselectedRows ? allMatches : matches);

	const total = $derived(allMatches.length);
	const highlighted = $derived(matches.length);
	const coreCount = $derived(
		allMatches.filter((m) => m.isCoreProgression).length
	);
	const nonCoreCount = $derived(total - coreCount);
	const strictSubsetCount = $derived(
		allMatches.filter((m) => m.isStrictSubset).length
	);

	const hasMore = $derived(tableRows.length > MAX_COLLAPSED_RESULTS);
	const visibleMatches = $derived(
		showAll ? tableRows : tableRows.slice(0, MAX_COLLAPSED_RESULTS)
	);
</script>

<ProgressionMatchSummary
	{total}
	{highlighted}
	{coreCount}
	{nonCoreCount}
	{strictSubsetCount}
/>

<ProgressionMatchScatterPlot
	{allMatches}
	highlightedMatches={matches}
	{activeProgression}
	{onselect}
/>

<table
	class="match-table"
	style="--match-button-column-width: {BUTTON_COLUMN_WIDTH_PERCENT}%; --match-chords-column-width: {CHORDS_COLUMN_WIDTH_PERCENT}%; --column-gap: {COLUMN_GAP_REM}rem;"
>
	<colgroup>
		<col class="match-button-column" />
		<col class="match-chords-column" />
	</colgroup>
	<tbody>
		{#each visibleMatches as match (match.chordProgression)}
			{@const isSelected = selectedKeys.has(match.chordProgression)}
			{@const effectivePalette = isSelected ? match.highlightPalette : NON_SELECTED_PROGRESSION_PALETTE}
			{@const outline = isSelected ? matchOutline(match) : { color: NON_SELECTED_PROGRESSION_PALETTE.border, dashed: !!match.isStrictSubset }}
			<tr
				class="match-row"
				class:match-row-active={activeProgression === match.chordProgression}
				class:match-row-unselected={!isSelected}
			>
				<td class="match-button-cell">
					<ProgressionMatchButton
						{match}
						active={activeProgression === match.chordProgression}
						borderColor={outline.color}
						dashed={outline.dashed}
						{onselect}
					>
						{#snippet stats({ active })}
							<SongProgressionStats
								matchCount={match.matchCount}
								coveragePercent={match.coveragePercent}
								{active}
							/>
						{/snippet}
					</ProgressionMatchButton>
					{#if match.isFullSectionSingleMatch}
						<span class="full-section-badge">fills a section</span>
					{/if}
				</td>
				<td class="match-chords-cell">
					<SongChordsDisplay
						{song}
						parsedProgression={match.parsedProgression}
						highlightPalette={effectivePalette}
						isStrictSubset={match.isStrictSubset}
					/>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

{#if hasMore}
	<button
		class="show-more-btn"
		onclick={() => {
			showAll = !showAll;
		}}
	>
		{#if showAll}
			Collapse to {MAX_COLLAPSED_RESULTS} / {tableRows.length}
		{:else}
			{MAX_COLLAPSED_RESULTS} / {tableRows.length} results. Click to show all {tableRows.length}
		{/if}
	</button>
{/if}

<style>
	.match-table {
		width: 100%;
		border-collapse: collapse;
		table-layout: fixed;
	}

	.match-button-column {
		width: var(--match-button-column-width);
	}

	.match-chords-column {
		width: var(--match-chords-column-width);
	}

	.match-row {
		border-top: 1px solid #27272a;
	}

	.match-row:last-child {
		border-bottom: 1px solid #27272a;
	}

	.match-row:hover,
	.match-row-active {
		background: rgba(255, 255, 255, 0.03);
	}

	.match-row-unselected {
		opacity: 0.5;
	}

	.match-button-cell {
		vertical-align: top;
		padding: 0.625rem calc(var(--column-gap) / 2) 0.625rem 0;
		width: var(--match-button-column-width);
		max-width: var(--match-button-column-width);
		overflow: hidden;
	}

	.match-chords-cell {
		vertical-align: top;
		padding: 0.625rem 0 0.625rem calc(var(--column-gap) / 2);
		width: var(--match-chords-column-width);
		max-width: var(--match-chords-column-width);
		min-width: 0;
		overflow: hidden;
	}

	.show-more-btn {
		display: block;
		width: 100%;
		margin-top: 0.375rem;
		padding: 0.375rem 0.75rem;
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.375rem;
		color: rgba(161, 161, 170, 0.7);
		font-size: 0.7rem;
		text-align: center;
		cursor: pointer;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
	}

	.show-more-btn:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.15);
		color: #a1a1aa;
	}

	.full-section-badge {
		display: inline-block;
		margin-top: 0.25rem;
		padding: 0.1rem 0.35rem;
		font-size: 0.6rem;
		color: rgba(134, 239, 172, 0.7);
		border: 1px solid rgba(134, 239, 172, 0.25);
		border-radius: 0.25rem;
		white-space: nowrap;
	}
</style>
