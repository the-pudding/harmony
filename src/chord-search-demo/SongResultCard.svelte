<script lang="ts">
	import { isPositionInMatch } from "../chord-processing/match-chord-progressions/match.js";
	import type { SongSearchResult } from "../chord-processing/types.js";
	import { buildYouTubeSearchUrl } from "./youtubeSearch.js";

	let { result }: { result: SongSearchResult } = $props();

	const songLength = $derived(result.song.parsedProgression.length);
	const isMatched = $derived(result.matches.length > 0);
	const youtubeSearchUrl = $derived(
		buildYouTubeSearchUrl({
			title: result.song.title,
			artist: result.song.artist,
			year: result.song.year
		})
	);
</script>

<div class="card" class:matched={isMatched}>
	<div class="title">
		<span class="song-title">{result.song.title}</span>
		<span class="artist"> — {result.song.artist}</span>
		<a
			class="youtube-search"
			href={youtubeSearchUrl}
			target="_blank"
			rel="noopener noreferrer"
			aria-label="Search on YouTube"
			title="Search on YouTube"
		>🎵</a>
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

	.title {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.125rem;
	}

	.song-title {
		color: #fff;
		font-weight: 500;
	}

	.artist {
		color: #71717a;
	}

	.youtube-search {
		font-size: 0.625rem;
		line-height: 1;
		text-decoration: none;
		opacity: 0.55;
		transition: opacity 0.15s;
	}

	.youtube-search:hover {
		opacity: 1;
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
