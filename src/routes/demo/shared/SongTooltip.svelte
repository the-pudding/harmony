<script lang="ts">
	import coreProgressionsData from "$data/core-progressions.js";
	import type { GroupedSong } from "../../../data/songBrowser.js";
	import {
		buildFinalChordAnnotations,
		selectFinalProgressions
	} from "../define-chord-progression/progression-matching-logic/finalProgressionSelection.js";
	import { EXPLAINED_THRESHOLD_PERCENT } from "../define-chord-progression/constants.js";
	import FinalAnnotatedSong from "../define-chord-progression/components/FinalAnnotatedSong.svelte";
	import SongMetadataHeader from "../define-chord-progression/components/SongMetadataHeader.svelte";

	type Props = {
		song: GroupedSong;
		expanded?: boolean;
	};

	const { song, expanded = true }: Props = $props();

	let activeProgression = $state<string | null>(null);

	const selection = $derived(
		selectFinalProgressions(song, coreProgressionsData)
	);
	const annotations = $derived(buildFinalChordAnnotations(song, selection));
	const matches = $derived([
		...selection.coreSelected,
		...selection.gapSelected
	]);
</script>

{#if expanded}
	<FinalAnnotatedSong
		{song}
		{matches}
		{annotations}
		explainedPercent={selection.explainedPercent}
		isExplained={selection.explainedPercent > EXPLAINED_THRESHOLD_PERCENT}
		{activeProgression}
		onselect={(chordProgression) => {
			activeProgression =
				activeProgression === chordProgression ? null : chordProgression;
		}}
	/>
{:else}
	<SongMetadataHeader {song} />
{/if}
