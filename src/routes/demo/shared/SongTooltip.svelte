<script lang="ts">
	import coreProgressionsData from "$data/core-progressions.js";
	import type { GroupedSong } from "../../../data/songBrowser.js";
	import { matchSongV2 } from "../match-algo-v2/match-algo-v2-logic/matchSongV2.js";
	import { DEFAULT_WEIGHTS } from "../match-algo-v2/match-algo-v2-logic/weights.js";
	import FinalAnnotatedSong from "../define-chord-progression/components/FinalAnnotatedSong.svelte";

	type Props = {
		song: GroupedSong;
		matchingProgressions?: readonly string[] | null;
		explainedPercent?: number;
	};

	const {
		song,
		matchingProgressions = null,
		explainedPercent
	}: Props = $props();

	let activeProgression = $state<string | null>(null);

	const result = $derived(
		matchSongV2(song, coreProgressionsData, DEFAULT_WEIGHTS)
	);

	const progressionFilter = $derived(
		matchingProgressions === null ? null : new Set(matchingProgressions)
	);

	const matches = $derived(
		progressionFilter === null
			? result.matches
			: result.matches.filter((match) =>
					progressionFilter.has(match.chordProgression)
				)
	);

	const annotations = $derived(
		progressionFilter === null
			? result.annotations
			: result.annotations.filter(
					(annotation) =>
						annotation.chordProgression !== undefined &&
						progressionFilter.has(annotation.chordProgression)
				)
	);

	const displayExplainedPercent = $derived(
		explainedPercent ?? result.explainedPercent
	);
</script>

<FinalAnnotatedSong
	compact
	{song}
	{matches}
	{annotations}
	explainedPercent={displayExplainedPercent}
	{activeProgression}
	onselect={(chordProgression) => {
		activeProgression =
			activeProgression === chordProgression ? null : chordProgression;
	}}
/>
