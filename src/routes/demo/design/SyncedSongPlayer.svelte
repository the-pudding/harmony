<script lang="ts">
	import ChordTimeline from "./ChordTimeline.svelte";
	import SongPlayerCard from "./SongPlayerCard.svelte";
	import {
		buildEvenlySpacedChordTimeline,
		progressFractionOf
	} from "./chordTimeline.js";
	import type { DesignSong } from "./designSongs.js";

	type Props = {
		song: DesignSong;
	};

	let { song }: Props = $props();

	let paused = $state(true);
	let currentTime = $state(0);
	let duration = $state(NaN);

	const timeline = $derived(buildEvenlySpacedChordTimeline(song.sections));
	const progressFraction = $derived(progressFractionOf(currentTime, duration));

	function togglePlayback() {
		paused = !paused;
	}

	function seekTo(fraction: number) {
		if (!Number.isFinite(duration)) return;
		currentTime = fraction * duration;
	}
</script>

<section class="synced-player">
	<SongPlayerCard {song} {paused} onTogglePlayback={togglePlayback} />
	<ChordTimeline {timeline} {progressFraction} onSeek={seekTo} />
	<audio
		bind:paused
		bind:currentTime
		bind:duration
		src={song.audioSrc}
		preload="metadata"
	></audio>
</section>

<style>
	.synced-player {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
</style>
