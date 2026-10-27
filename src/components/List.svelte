<script>
	import data from "$data/charts/top-progressions.csv";
	import { chordify } from "$utils/chordify";

	const { highlight, obscure } = $props();
</script>

<figure {@attach chordify}>
	<div class="title">The Top Chord Progressions in Top-20 Hits, 1958-2026</div>

	{#each data as { name, rank, chordProgression, scale }}
		<div
			class="row"
			class:faded={highlight?.length && !highlight?.includes(name)}
			class:obscure={obscure === "true" && !highlight?.includes(name)}
		>
			<span class="rank">{rank}</span>{name}
			<span class="chords" data-tonality={scale}>{chordProgression}</span>
		</div>
	{/each}
</figure>

<style>
	figure {
	}

	.title {
		font-size: var(--14px);
		font-weight: bold;
		margin-bottom: 0.5rem;
	}

	.chords {
		margin-left: 0.5rem;
	}

	.row {
		font-family: var(--font-serif);
		font-size: var(--20px);
		display: flex;
		align-items: center;
		padding: 0 4px;
		width: fit-content;
		transition:
			opacity 0.2s,
			filter 0.2s;
	}

	.row.faded {
		opacity: 0.2;
	}

	.row.obscure {
		opacity: 1;
		filter: blur(8px);
	}

	.rank {
		font-family: var(--font-mono);
		font-size: 10px;
		opacity: 0.7;
		margin-right: 6px;
	}
</style>
