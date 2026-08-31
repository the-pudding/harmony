<script lang="ts">
	import coreProgressionsData from "$data/core-progressions.js";
	import type { GroupedSong } from "../../../data/songBrowser.js";
	import {
		buildFinalChordAnnotations,
		selectFinalProgressions
	} from "../define-chord-progression/progression-matching-logic/finalProgressionSelection.js";
	import FinalAnnotatedSong from "../define-chord-progression/components/FinalAnnotatedSong.svelte";

	type Props = {
		song: GroupedSong;
	};

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
	compact
	{song}
	{matches}
	{annotations}
	explainedPercent={selection.explainedPercent}
	{activeProgression}
	onselect={(chordProgression) => {
		activeProgression =
			activeProgression === chordProgression ? null : chordProgression;
	}}
/>
