<script>
	import progressionsData from "$data/charts/top-progressions.csv";
	import Chord from "$components/Chord.svelte";
	import coreProgressions from "$data/core-progressions";
	import { romanRe } from "$utils/chordify";

	// chords: [{ seconds, roman }], timed against whatever media drives currentTime
	let { cluster, chords, currentTime } = $props();

	// Clusters not in top-progressions are named by their progressions
	// ("I-IV vamp · Cheerleader (verse)") or numerals ("V-I-IV"); use the
	// first one, as a core progression's chords or as numerals.
	const fallbackProgression = (name) => {
		const first = name?.split(" · ")[0].trim();
		if (!first) return undefined;
		const core = coreProgressions.find((d) => d.name === first);
		if (core)
			return {
				chordProgression: [core.chordProgression].flat()[0],
				scale: core.scale
			};
		const isRoman = first.split("-").every((r) => romanRe.test(r.trim()));
		return isRoman ? { chordProgression: first, scale: "major" } : undefined;
	};

	const progressionData = $derived(
		progressionsData.find((d) => d.name === cluster) ??
			fallbackProgression(cluster)
	);
	const progression = $derived(progressionData?.chordProgression);
	const tonality = $derived(
		progressionData?.scale === "minor" ? "minor" : "major"
	);
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
