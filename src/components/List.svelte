<script>
	import data from "$data/top-progressions.csv";

	const { highlight } = $props();
</script>

<figure class="frosted">
	<div class="title">The Top Chord Progressions in Top-20 Hits, 1958-2026</div>

	{#each data as { name, rank, chordProgression }}
		<div class="row" class:highlighted={highlight?.includes(name)}>
			<span class="rank">{rank}</span>{name} (<span class="chord"
				>{chordProgression}</span
			>)
		</div>
	{/each}
</figure>

<style>
	figure {
		justify-self: flex-end;
		padding: 1rem;
		padding-top: 0;
		max-width: 450px;
	}

	.title {
		font-size: var(--24px);
		font-weight: bold;
		margin-bottom: 0.5rem;
	}

	.chord {
		font-size: var(--12px);
	}

	.row {
		font-family: var(--font-serif);
		font-size: var(--20px);
		display: flex;
		align-items: center;
		padding: 0 4px;
		width: fit-content;
	}

	.row.highlighted {
		background: #ffe0ae;
	}

	.rank {
		font-family: var(--font-mono);
		font-size: 10px;
		opacity: 0.7;
		margin-right: 6px;
	}
</style>
