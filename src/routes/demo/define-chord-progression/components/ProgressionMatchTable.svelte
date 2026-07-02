<script lang="ts">
	import type { GroupedSong } from "../../progressions/songBrowser.js";
	import type { ProgressionWithMatchStats } from "../progression-matching-logic/progressionMatchAnalysis.js";
	import type { ChordHighlightPalette } from "./progressionColors.js";
	import { CORE_PROGRESSION_PALETTE, DEFAULT_PROGRESSION_PALETTE } from "./progressionColors.js";
	import ProgressionMatchButton from "./ProgressionMatchButton.svelte";
	import SongChordsDisplay from "./SongChordsDisplay.svelte";
	import { BUTTON_COLUMN_WIDTH_PERCENT, CHORDS_COLUMN_WIDTH_PERCENT, COLUMN_GAP_REM } from "./progressionTableLayout.js";

	type Props = {
		matches: ProgressionWithMatchStats[];
		song: GroupedSong;
		activeProgression: string | null;
		onselect: (chordProgression: string) => void;
		chordHighlightPalette?: ChordHighlightPalette;
	};

	let {
		matches,
		song,
		activeProgression,
		onselect,
		chordHighlightPalette = DEFAULT_PROGRESSION_PALETTE
	}: Props = $props();
</script>

<table
	class="match-table"
	style="--match-button-column-width: {BUTTON_COLUMN_WIDTH_PERCENT}%; --match-chords-column-width: {CHORDS_COLUMN_WIDTH_PERCENT}%; --column-gap: {COLUMN_GAP_REM}rem;"
>
	<colgroup>
		<col class="match-button-column" />
		<col class="match-chords-column" />
	</colgroup>
	<tbody>
		{#each matches as match (match.chordProgression)}
			<tr
				class="match-row"
				class:match-row-active={activeProgression === match.chordProgression}
			>
				<td class="match-button-cell">
					<ProgressionMatchButton
						{match}
						active={activeProgression === match.chordProgression}
						borderColor={match.name ? CORE_PROGRESSION_PALETTE.border : undefined}
						{onselect}
					/>
				</td>
				<td class="match-chords-cell">
					<SongChordsDisplay
						{song}
						chordProgression={match.chordProgression}
						highlightPalette={chordHighlightPalette}
					/>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

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
</style>
