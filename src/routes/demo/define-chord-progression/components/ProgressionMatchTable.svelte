<script lang="ts">
	import type { GroupedSong } from "../../progressions/songBrowser.js";
	import type { ProgressionWithMatchStats } from "../progression-matching-logic/progressionMatchAnalysis.js";
	import ProgressionMatchButton from "./ProgressionMatchButton.svelte";
	import ProgressionMatchScatterPlot from "./ProgressionMatchScatterPlot.svelte";
	import SongChordsDisplay from "./SongChordsDisplay.svelte";
	import { BUTTON_COLUMN_WIDTH_PERCENT, CHORDS_COLUMN_WIDTH_PERCENT, COLUMN_GAP_REM } from "./progressionTableLayout.js";

	const MAX_COLLAPSED_RESULTS = 5;

	type Props = {
		matches: ProgressionWithMatchStats[];
		song: GroupedSong;
		activeProgression: string | null;
		onselect: (chordProgression: string) => void;
	};

	let { matches, song, activeProgression, onselect }: Props = $props();

	let showAll = $state(false);

	const total = $derived(matches.length);
	const hasMore = $derived(total > MAX_COLLAPSED_RESULTS);
	const visibleMatches = $derived(showAll ? matches : matches.slice(0, MAX_COLLAPSED_RESULTS));
</script>

<ProgressionMatchScatterPlot {matches} {activeProgression} {onselect} />

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
			<tr
				class="match-row"
				class:match-row-active={activeProgression === match.chordProgression}
			>
				<td class="match-button-cell">
					<ProgressionMatchButton
						{match}
						active={activeProgression === match.chordProgression}
						borderColor={match.isCoreProgression
							? match.highlightPalette.border
							: undefined}
						{onselect}
					/>
				</td>
				<td class="match-chords-cell">
					<SongChordsDisplay
						{song}
						chordProgression={match.chordProgression}
						highlightPalette={match.highlightPalette}
					/>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

{#if hasMore}
	<button class="show-more-btn" onclick={() => { showAll = !showAll; }}>
		{#if showAll}
			Collapse to {MAX_COLLAPSED_RESULTS} / {total}
		{:else}
			{MAX_COLLAPSED_RESULTS} / {total} results. Click to show all {total}
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
</style>
