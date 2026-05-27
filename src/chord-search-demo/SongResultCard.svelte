<script lang="ts">
	import { isPositionInMatch } from "../chord-processing/match-chord-progressions/match.js";
	import type { SongSearchResult } from "../chord-processing/types.js";

	let { result }: { result: SongSearchResult } = $props();

	const songLength = $derived(result.song.parsedProgression.length);
	const isMatched = $derived(result.matches.length > 0);
</script>

<div class="card" class:matched={isMatched}>
	<div class="title">
		<span class="song-title">{result.song.title}</span>
		<span class="artist"> — {result.song.artist}</span>
	</div>
	<div class="chords">
		{#each result.song.parsedProgression as chord, position}
			{@const highlighted = result.matches.some((match) =>
				isPositionInMatch(position, match, songLength)
			)}
			<span class="chord" class:highlighted>{chord.display}</span>
			{#if position < result.song.parsedProgression.length - 1}
				<span class="dot">·</span>
			{/if}
		{/each}
	</div>
</div>

<style>
	.card {
		padding: 0.625rem;
		border: 1px solid #27272a;
		border-radius: 0.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.card.matched {
		background: rgba(30, 27, 75, 0.2);
		border-color: rgba(49, 46, 129, 0.4);
	}

	.song-title {
		color: #fff;
		font-weight: 500;
	}

	.artist {
		color: #71717a;
	}

	.chords {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.125rem;
		font-size: 0.75rem;
	}

	.chord {
		color: #a1a1aa;
		padding: 0.125rem 0.375rem;
	}

	.chord.highlighted {
		background: #4338ca;
		color: #fff;
		border-radius: 0.25rem;
		font-weight: 500;
	}

	.dot {
		color: #3f3f46;
	}
</style>
