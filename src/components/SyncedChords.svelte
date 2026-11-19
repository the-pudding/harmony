<script>
	import Chord from "$components/Chord.svelte";
	import { progressionFor } from "$data/clusterProgression.js";
	import { activeChordIndex as activeChordIndexAt } from "$utils/activeChordIndex";

	// chords: [{ seconds, roman }], timed against whatever media drives currentTime
	let { cluster, chords, currentTime } = $props();

	const progression = $derived(progressionFor(cluster)?.chordProgression);
	const tonality = $derived(progressionFor(cluster)?.tonality ?? "major");
	const loop = $derived(progression?.split("-").map((d) => d.trim()) ?? []);

	const activeChordIndex = $derived(
		activeChordIndexAt(chords, loop, currentTime)
	);
</script>

<span class="chords" data-chords={progression}>
	{#each loop as roman, i (`${progression}-${i}`)}
		<span
			class="chord"
			class:playing={i === activeChordIndex}
			class:faded={activeChordIndex !== null && i !== activeChordIndex}
		>
			<Chord chord={roman} {tonality} />
		</span>
	{/each}
</span>

<style>
	.chords {
		font-size: var(--40px);
	}

	.chord {
		display: inline-block;
		transition:
			transform 150ms,
			opacity 150ms;
	}

	.chord.playing {
		opacity: 1;
		transform: scale(1.3);
	}

	.chord.faded {
		opacity: 0.4;
		transform: scale(1);
	}
</style>
