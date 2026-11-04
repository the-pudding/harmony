<script>
	import progressionsData from "$data/charts/top-progressions.csv";
	import Chord from "$components/Chord.svelte";

	// chords: [{ seconds, roman }], timed against whatever media drives currentTime
	let { cluster, chords, currentTime } = $props();

	const progressionData = $derived(
		progressionsData.find((d) => d.name === cluster)
	);
	const progression = $derived(progressionData?.chordProgression);
	const tonality = $derived(progressionData?.scale ?? "major");
	const loop = $derived(progression?.split("-").map((d) => d.trim()) ?? []);

	const activeChordIndex = $derived.by(() => {
		if (!chords || !loop.length) return null;
		let pos = 0;
		let index = null;
		for (const { seconds, roman } of chords) {
			if (seconds > currentTime) break;
			if (roman === loop[pos]) index = pos;
			else if (roman === loop[0]) index = 0;
			else {
				index = null;
				continue;
			}
			pos = (index + 1) % loop.length;
		}
		return index;
	});
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
