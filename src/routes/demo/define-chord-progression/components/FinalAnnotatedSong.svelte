<script lang="ts">
	import type { GroupedSong } from "../../progressions/songBrowser.js";
	import type { ProgressionWithMatchStats, ChordAnnotation } from "../progression-matching-logic/progressionMatchAnalysis.js";
	import ChordProgressionIssuesNote from "./ChordProgressionIssuesNote.svelte";
	import { matchOutline } from "./progressionColors.js";
	import ProgressionMatchButton from "./ProgressionMatchButton.svelte";
	import SongChordsDisplay from "./SongChordsDisplay.svelte";
	import SongMetadataHeader from "./SongMetadataHeader.svelte";
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

	const hasMatches = $derived(sortedMatches.length > 0);
</script>

<div class="final-annotated-song">
	<SongMetadataHeader {song} />
	<ChordProgressionIssuesNote songKey={song.songKey} />
	<div
		class="final-layout"
		class:final-layout-chords-only={!hasMatches}
		style="--button-col-width: {BUTTON_COLUMN_WIDTH_PERCENT}%; --chords-col-width: {CHORDS_COLUMN_WIDTH_PERCENT}%; --column-gap: {COLUMN_GAP_REM}rem;"
	>
		{#if hasMatches}
			<div class="buttons-column">
				{#each sortedMatches as match (match.chordProgression)}
					{@const outline = matchOutline(match)}
					<ProgressionMatchButton
						{match}
						active={activeProgression === match.chordProgression}
						borderColor={outline.color}
						dashed={outline.dashed}
						{onselect}
					/>
				{/each}
				<div class="total-row">
					<span class="total-label">= <strong class="total-percent">{explainedPercent}%</strong> of the song{#if isExplained}<span class="checkmark">✅</span>{/if}</span>
				</div>
			</div>
		{/if}
		<div class="chords-column">
			<SongChordsDisplay {song} {annotations} />
		</div>
	</div>
</div>

<style>
	.final-annotated-song {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		width: 100%;
	}

	.final-layout {
		display: grid;
		grid-template-columns: var(--button-col-width) var(--chords-col-width);
		column-gap: var(--column-gap);
		width: 100%;
	}

	.final-layout-chords-only {
		grid-template-columns: 1fr;
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
