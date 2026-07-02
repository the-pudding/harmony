<script lang="ts">
	import type { GroupedSong } from "../progressions/songBrowser.js";
	import type { ProgressionWithMatchStats, ChordAnnotation } from "./progressionMatchAnalysis.js";
	import { CORE_PROGRESSION_PALETTE } from "./progressionColors.js";
	import ProgressionMatchButton from "./ProgressionMatchButton.svelte";
	import SongChordsDisplay from "./SongChordsDisplay.svelte";
	import { BUTTON_COLUMN_WIDTH_PERCENT, CHORDS_COLUMN_WIDTH_PERCENT, COLUMN_GAP_REM } from "./progressionTableLayout.js";

	type Props = {
		song: GroupedSong;
		matches: ProgressionWithMatchStats[];
		annotations: ChordAnnotation[];
		explainedPercent: number;
		isExplained: boolean;
		activeProgression: string | null;
		onselect: (chordProgression: string) => void;
	};

	let { song, matches, annotations, explainedPercent, isExplained, activeProgression, onselect }: Props =
		$props();

	const sortedMatches = $derived(
		[...matches].sort((a, b) => b.coveragePercent - a.coveragePercent)
	);
</script>

<div
	class="final-layout"
	style="--button-col-width: {BUTTON_COLUMN_WIDTH_PERCENT}%; --chords-col-width: {CHORDS_COLUMN_WIDTH_PERCENT}%; --column-gap: {COLUMN_GAP_REM}rem;"
>
	<div class="buttons-column">
		{#each sortedMatches as match (match.chordProgression)}
			<ProgressionMatchButton
				{match}
				active={activeProgression === match.chordProgression}
				borderColor={match.name ? CORE_PROGRESSION_PALETTE.border : undefined}
				{onselect}
			/>
		{/each}
		<div class="total-row">
			<span class="total-label">= <strong class="total-percent">{explainedPercent}%</strong> of the song{#if isExplained}<span class="checkmark">✅</span>{/if}</span>
		</div>
	</div>
	<div class="chords-column">
		<SongChordsDisplay {song} {annotations} />
	</div>
</div>

<style>
	.final-layout {
		display: grid;
		grid-template-columns: var(--button-col-width) var(--chords-col-width);
		column-gap: var(--column-gap);
		width: 100%;
	}

	.buttons-column {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		min-width: 0;
	}

	.total-row {
		margin-top: 0.25rem;
		padding-top: 0.375rem;
		border-top: 1px solid #27272a;
	}

	.total-label {
		font-size: 0.75rem;
		color: #f4f4f5;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}

	.total-percent {
		font-weight: 700;
		color: #fff;
	}

	.checkmark {
		margin-left: 0.375rem;
	}

	.chords-column {
		min-width: 0;
		overflow: hidden;
	}
</style>
