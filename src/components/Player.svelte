<script>
	import progressionsData from "$data/top-progressions.csv";
	import { chordify } from "$utils/chordify";

	let { cluster } = $props();

	const progression = $derived(
		progressionsData.find((d) => d.name === cluster)?.chordProgression
	);
</script>

<div class="player" {@attach chordify}>
	<span class="chords">
		{progression}
	</span>
</div>

<style>
	.player {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.chords {
		font-size: var(--40px);
	}
</style>
