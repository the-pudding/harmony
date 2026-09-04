<script lang="ts">
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import {
		getChordMatchingChallenges,
		CHORD_MATCHING_CHALLENGES_LABEL
	} from "$data/hand-reviewed-songs.js";
	import {
		progressionMatchListKey,
		type ProgressionWithMatchStats,
		type ChordAnnotation
	} from "../progression-matching-logic/progressionMatchAnalysis.js";
	import ChordProgressionIssuesNote from "./ChordProgressionIssuesNote.svelte";
	import { matchOutline } from "./progressionColors.js";
	import ProgressionMatchButton from "./ProgressionMatchButton.svelte";
	import SongProgressionStats from "./progression-match-stats/SongProgressionStats.svelte";
	import SongChordsDisplay from "./SongChordsDisplay.svelte";
	import SongMetadataHeader from "./SongMetadataHeader.svelte";
	import {
		BUTTON_COLUMN_WIDTH_PERCENT,
		CHORDS_COLUMN_WIDTH_PERCENT,
		COLUMN_GAP_REM
	} from "./progressionTableLayout.js";

	const MATCH_LIST_COLUMN_COUNT = 2;
	const LOCKED_MATCH_LIST_ROW_COUNT = 4;
	const LOCKED_MATCH_BUTTON_HEIGHT_REM = 1.35;
	const LOCKED_MATCH_LIST_GAP_REM = 0.25;
	const LOCKED_MATCH_LIST_HEIGHT_REM =
		LOCKED_MATCH_LIST_ROW_COUNT * LOCKED_MATCH_BUTTON_HEIGHT_REM +
		(LOCKED_MATCH_LIST_ROW_COUNT - 1) * LOCKED_MATCH_LIST_GAP_REM;
	const LOCKED_MATCH_LIST_CAPACITY =
		MATCH_LIST_COLUMN_COUNT * LOCKED_MATCH_LIST_ROW_COUNT;

	type Props = {
		song: GroupedSong;
		matches: ProgressionWithMatchStats[];
		annotations: ChordAnnotation[];
		explainedPercent: number;
		activeProgression: string | null;
		onselect: (chordProgression: string) => void;
		compact?: boolean;
		showMetadata?: boolean;
		lockMatchListHeight?: boolean;
	};

	let {
		song,
		matches,
		annotations,
		explainedPercent,
		activeProgression,
		onselect,
		compact = false,
		showMetadata = true,
		lockMatchListHeight = false
	}: Props = $props();

	const sortedMatches = $derived(
		[...matches].sort((a, b) => b.coveragePercent - a.coveragePercent)
	);

	const uniqueSortedMatches = $derived(
		sortedMatches.reduce<ProgressionWithMatchStats[]>((unique, match) => {
			const key = progressionMatchListKey(match);
			return unique.some(
				(existing) => progressionMatchListKey(existing) === key
			)
				? unique
				: [...unique, match];
		}, [])
	);

	const visibleMatches = $derived(
		lockMatchListHeight
			? uniqueSortedMatches.slice(0, LOCKED_MATCH_LIST_CAPACITY)
			: uniqueSortedMatches
	);

	const hiddenMatchCount = $derived(
		Math.max(0, uniqueSortedMatches.length - visibleMatches.length)
	);

	const hasMatches = $derived(uniqueSortedMatches.length > 0);
	const showMatchList = $derived(hasMatches || lockMatchListHeight);

	let hoveredProgression = $state<string | null>(null);

	const focusedProgression = $derived(hoveredProgression ?? activeProgression);

	const chordMatchingChallenges = $derived(getChordMatchingChallenges(song.songKey));
</script>

<div class="final-annotated-song" class:compact>
	{#if showMetadata}
		<SongMetadataHeader {song} />
		<ChordProgressionIssuesNote songKey={song.songKey} size={compact ? "sm" : "md"} />
		{#if chordMatchingChallenges}
			<ChordProgressionIssuesNote
				songKey={song.songKey}
				overrideText={chordMatchingChallenges}
				overrideLabel={CHORD_MATCHING_CHALLENGES_LABEL}
				overrideColor="rgba(251, 191, 36, 0.95)"
				overrideColorHover="rgba(253, 224, 71, 0.95)"
				size={compact ? "sm" : "md"}
			/>
		{/if}
	{/if}
	<div
		class="final-layout"
		class:final-layout-chords-only={!hasMatches && !compact}
		class:final-layout-compact={compact}
		style={compact ? undefined : `--button-col-width: ${BUTTON_COLUMN_WIDTH_PERCENT}%; --chords-col-width: ${CHORDS_COLUMN_WIDTH_PERCENT}%; --column-gap: ${COLUMN_GAP_REM}rem;`}
	>
		{#if showMatchList}
			<div
				class="buttons-column"
				class:buttons-column-locked={lockMatchListHeight}
				style={lockMatchListHeight
					? `--locked-match-list-height: ${LOCKED_MATCH_LIST_HEIGHT_REM}rem; --locked-match-list-columns: ${MATCH_LIST_COLUMN_COUNT}; --locked-match-list-rows: ${LOCKED_MATCH_LIST_ROW_COUNT}; --locked-match-list-gap: ${LOCKED_MATCH_LIST_GAP_REM}rem;`
					: undefined}
			>
				<div class="buttons-grid">
					{#each visibleMatches as match (progressionMatchListKey(match))}
						{@const outline = matchOutline(match)}
						{#snippet progressionStats({ active }: { active: boolean })}
							<SongProgressionStats
								matchCount={match.matchCount}
								coveragePercent={match.coveragePercent}
								{active}
							/>
						{/snippet}
						<ProgressionMatchButton
							{match}
							{compact}
							stats={compact ? undefined : progressionStats}
							active={activeProgression === match.chordProgression}
							borderColor={outline.color}
							dashed={outline.dashed}
							{onselect}
							onhover={(chordProgression) => {
								hoveredProgression = chordProgression;
							}}
							onunhover={() => {
								hoveredProgression = null;
							}}
						/>
					{/each}
				</div>
				<div class="total-row">
					<span class="total-label"
						>= <strong class="total-percent">{explainedPercent}%</strong> of the
						song</span
					>
					{#if hiddenMatchCount > 0}
						<span class="hidden-count"
							>{hiddenMatchCount} more not shown</span
						>
					{/if}
				</div>
			</div>
		{/if}
		<div class="chords-column">
			<SongChordsDisplay {song} {annotations} {focusedProgression} {compact} />
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

	.final-annotated-song.compact {
		gap: 0.375rem;
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

	.final-layout-compact {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		width: 100%;
	}

	.buttons-column {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		min-width: 0;
	}

	.final-layout-compact .buttons-column {
		gap: 0.25rem;
	}

	.buttons-grid {
		display: flex;
		flex-direction: column;
		gap: inherit;
		min-width: 0;
	}

	.buttons-column-locked .buttons-grid {
		display: grid;
		grid-template-columns: repeat(var(--locked-match-list-columns), minmax(0, 1fr));
		grid-template-rows: repeat(var(--locked-match-list-rows), minmax(0, 1fr));
		grid-auto-flow: column;
		height: var(--locked-match-list-height);
		gap: var(--locked-match-list-gap);
		overflow: hidden;
	}

	.buttons-column-locked :global(.prog-btn) {
		min-height: 0;
		height: 100%;
	}

	.total-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 0.25rem;
		padding-top: 0.375rem;
		border-top: 1px solid #27272a;
	}

	.hidden-count {
		font-size: 0.625rem;
		color: #71717a;
		white-space: nowrap;
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

	.chords-column {
		min-width: 0;
		overflow: hidden;
	}
</style>
