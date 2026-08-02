<script lang="ts">
	import coreProgressionsData from "$data/core-progressions.js";
	import type { GroupedSong } from "../../../data/songBrowser.js";
	import {
		buildFinalChordAnnotations,
		selectFinalProgressions
	} from "../define-chord-progression/progression-matching-logic/finalProgressionSelection.js";
	import { EXPLAINED_THRESHOLD_PERCENT } from "../define-chord-progression/constants.js";
	import FinalAnnotatedSong from "../define-chord-progression/components/FinalAnnotatedSong.svelte";

	type Props = { song: GroupedSong };

	const { song }: Props = $props();

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
