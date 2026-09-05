<script lang="ts">
	import coreProgressionsData from "$data/core-progressions.js";
	import type { GroupedSong } from "../../../data/songBrowser.js";
	import { matchSongV2 } from "../match-algo-v2/match-algo-v2-logic/matchSongV2.js";
	import { DEFAULT_WEIGHTS } from "../match-algo-v2/match-algo-v2-logic/weights.js";
	import FinalAnnotatedSong from "../define-chord-progression/components/FinalAnnotatedSong.svelte";

	type Props = {
		song: GroupedSong;
	};

	const { song }: Props = $props();

	let activeProgression = $state<string | null>(null);

	const result = $derived(
		matchSongV2(song, coreProgressionsData, DEFAULT_WEIGHTS)
	);
</script>

<FinalAnnotatedSong
	compact
	{song}
	matches={result.matches}
	annotations={result.annotations}
	explainedPercent={result.explainedPercent}
	{activeProgression}
	onselect={(chordProgression) => {
		activeProgression =
			activeProgression === chordProgression ? null : chordProgression;
	}}
/>
