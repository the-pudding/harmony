<script>
	import progressionsData from "$data/charts/top-progressions.csv";
	import { chordify } from "$utils/chordify";

	let { cluster } = $props();

	const progression = $derived(
		progressionsData.find((d) => d.name === cluster)?.chordProgression
	);
</script>

<div class="player" {@attach chordify}>
	<div class="name">{cluster}</div>
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

	.name {
		font-family: var(--font-serif);
		font-size: var(--32px);
		margin-bottom: 1rem;
	}

	.chords {
		font-size: var(--40px);
	}
</style>
