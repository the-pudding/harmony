<script lang="ts">
	import type { GroupedSong } from "../progressions/songBrowser.js";
	import type { ProgressionWithMatchStats } from "./progressionMatchAnalysis.js";
	import ProgressionMatchButton from "./ProgressionMatchButton.svelte";
	import SongChordsDisplay from "./SongChordsDisplay.svelte";

	const BUTTON_COLUMN_WIDTH_PERCENT = 22;
	const CHORDS_COLUMN_WIDTH_PERCENT = 100 - BUTTON_COLUMN_WIDTH_PERCENT;
	const COLUMN_GAP_REM = 1.25;
	const CORE_PROGRESSION_BORDER_COLOR = "rgba(134, 239, 172, 0.85)";

	type Props = {
		matches: ProgressionWithMatchStats[];
		song: GroupedSong;
		activeProgression: string | null;
		onselect: (chordProgression: string) => void;
	};

	let { matches, song, activeProgression, onselect }: Props = $props();
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
						borderColor={match.name ? CORE_PROGRESSION_BORDER_COLOR : undefined}
						{onselect}
					/>
				</td>
				<td class="match-chords-cell">
					<SongChordsDisplay song={song} chordProgression={match.chordProgression} />
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
