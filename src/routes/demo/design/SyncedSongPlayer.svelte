<script lang="ts">
	import ChordTimeline from "./ChordTimeline.svelte";
	import ChordTimingActions from "./ChordTimingActions.svelte";
	import SongPlayerCard from "./SongPlayerCard.svelte";
	import { progressFractionOf } from "./chordTimeline.js";
	import { createChordTimings } from "./chordTimings.svelte.js";
	import { chordStartTimesFilePath, type DesignSong } from "./designSongs.js";

	type Props = {
		song: DesignSong;
	};

	let { song }: Props = $props();

	let paused = $state(true);
	let currentTime = $state(0);
	let duration = $state(NaN);

	const chordTimings = createChordTimings(
		() => song,
		() => duration
	);
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
	<div class="header">
		<SongPlayerCard {song} {paused} onTogglePlayback={togglePlayback} />
		<ChordTimingActions
			json={chordTimings.json}
			targetFilePath={chordStartTimesFilePath(song.songKey)}
			hasLocalEdits={chordTimings.hasLocalEdits}
			onDiscardLocalEdits={chordTimings.discardLocalEdits}
		/>
	</div>
	<ChordTimeline
		timeline={chordTimings.timeline}
		{progressFraction}
		{duration}
		editable={chordTimings.editable}
		followPlayhead={!paused}
		onSeek={seekTo}
		onChordMove={chordTimings.moveChord}
	/>
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

	.header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
</style>
