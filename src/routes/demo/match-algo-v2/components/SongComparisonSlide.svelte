<script lang="ts">
	import V1V2SongCompare from "./V1V2SongCompare.svelte";
	import type { MatchWeights } from "../match-algo-v2-logic/weights.js";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import { getChordMatchingChallenges } from "../../../../data/hand-reviewed-songs.js";

	type Props = {
		song: GroupedSong;
		weights: MatchWeights;
		interactive: boolean;
	};

	const { song, weights, interactive }: Props = $props();

	const challenge = $derived(getChordMatchingChallenges(song.songKey));
</script>

<article class="slide">
	<h2 class="result-heading">
		{song.title}
		<span class="artist">{song.artists.join(", ")}</span>
	</h2>
	{#if challenge}
		<p class="challenge">{challenge}</p>
	{/if}

	<V1V2SongCompare {song} {weights} {interactive} />
</article>

<style>
	.slide {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
	}

	.result-heading {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #f4f4f5;
		display: flex;
		align-items: baseline;
		gap: 0.625rem;
	}

	.artist {
		font-size: 0.75rem;
		font-weight: 400;
		color: #71717a;
	}

	.challenge {
		margin: 0;
		font-size: 0.7rem;
		color: #a1a1aa;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
