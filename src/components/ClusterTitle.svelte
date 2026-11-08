<script>
	import SyncedChords from "$components/SyncedChords.svelte";

	// A cluster's name over its progression's chords: the player's header
	// at full size (with arrows, given onPrev/onNext), and every cluster's
	// label on the map at dot zoom at small size, so the two look the same.
	let {
		cluster,
		// [{ seconds, roman }] for the playing song, lighting up its chord
		chords = undefined,
		currentTime = 0,
		size = "full",
		onPrev = null,
		onNext = null
	} = $props();
</script>

<div class="cluster-title" class:small={size === "small"}>
	<div class="header">
		{#if onPrev}
			<button aria-label="Previous song" onclick={onPrev}>&larr;</button>
		{/if}
		<div class="name">{cluster}</div>
		{#if onNext}
			<button aria-label="Next song" onclick={onNext}>&rarr;</button>
		{/if}
	</div>
	<SyncedChords {cluster} {chords} {currentTime} />
</div>

<style>
	.cluster-title {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	/* The same layout, scaled down whole. */
	.cluster-title.small {
		zoom: 0.45;
		pointer-events: none;
	}

	.header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.name {
		font-family: var(--font-serif);
		font-size: var(--32px);
		white-space: nowrap;
		text-shadow:
			0 0 6px #09090b,
			0 0 12px #09090b;
	}
</style>
