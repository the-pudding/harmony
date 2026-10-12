<script lang="ts">
	import ChordTimeline from "./ChordTimeline.svelte";
	import ChordTimingActions from "./ChordTimingActions.svelte";
	import PlayerShortcutsHint from "./PlayerShortcutsHint.svelte";
	import SongPlayerCard from "./SongPlayerCard.svelte";
	import { SONG_START_SECONDS } from "./chordStartTimes.js";
	import { progressFractionOf } from "./chordTimeline.js";
	import { createChordTimings } from "./chordTimings.svelte.js";
	import { currentSearchParams } from "../shared/currentSearchParams.js";
	import { chordStartTimesFilePath, type DesignSong } from "./designSongs.js";
	import { readDesignUrlState } from "./designUrlState.js";
	import { syncDesignUrlState } from "./designUrlSync.svelte.js";
	import {
		isTypingTarget,
		playerActionFor,
		type PlayerAction
	} from "./playerShortcuts.js";
	import { createWaveform } from "./waveform.svelte.js";

	type Props = {
		song: DesignSong;
	};

	let { song }: Props = $props();

	const initialUrlState = readDesignUrlState(currentSearchParams());

	let paused = $state(true);
	let currentTime = $state(initialUrlState.playheadSeconds);
	let duration = $state(NaN);
	let zoom = $state(initialUrlState.zoom);

	syncDesignUrlState(() => ({ zoom, playheadSeconds: currentTime }));

	const chordTimings = createChordTimings(
		() => song,
		() => duration
	);
	const waveform = createWaveform(() => song.audioSrc);
	const progressFraction = $derived(progressFractionOf(currentTime, duration));

	function togglePlayback() {
		paused = !paused;
	}

	function restart() {
		currentTime = SONG_START_SECONDS;
		paused = false;
	}

	function seekToSeconds(seconds: number) {
		if (!Number.isFinite(duration)) return;
		currentTime = Math.min(Math.max(seconds, SONG_START_SECONDS), duration);
	}

	function seekTo(fraction: number) {
		seekToSeconds(fraction * duration);
	}

	function runPlayerAction(action: PlayerAction) {
		if (action.type === "togglePlayback") togglePlayback();
		else if (action.type === "restart") restart();
		else if (action.type === "undo") chordTimings.undo();
		else seekToSeconds(currentTime + action.seconds);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (isTypingTarget(event.target)) return;
		const action = playerActionFor(event);
		if (!action) return;
		event.preventDefault();
		runPlayerAction(action);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="synced-player">
	<div class="header">
		<SongPlayerCard
			{song}
			{paused}
			onTogglePlayback={togglePlayback}
			onRestart={restart}
		/>
		<ChordTimingActions
			json={chordTimings.json}
			targetFilePath={chordStartTimesFilePath(song.songKey)}
			hasLocalEdits={chordTimings.hasLocalEdits}
			onDiscardLocalEdits={chordTimings.discardLocalEdits}
		/>
	</div>
	<PlayerShortcutsHint />
	<ChordTimeline
		timeline={chordTimings.timeline}
		waveformPeaks={waveform.peaks}
		{progressFraction}
		{duration}
		editable={chordTimings.editable}
		{zoom}
		onZoomChange={(nextZoom) => (zoom = nextZoom)}
		onSeek={seekTo}
		onChordEditStart={chordTimings.beginEdit}
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
