<script lang="ts">
	import AlignmentControls from "./AlignmentControls.svelte";
	import ChordTimeline from "./ChordTimeline.svelte";
	import ChordTimingActions from "./ChordTimingActions.svelte";
	import PlayerShortcutsHint from "./PlayerShortcutsHint.svelte";
	import SongPlayerCard from "./SongPlayerCard.svelte";
	import { progressFractionOf } from "./chordTimeline.js";
	import { createChordTimings } from "./chordTimings.svelte.js";
	import { currentSearchParams } from "../shared/currentSearchParams.js";
	import { chordBeatsFilePath, type DesignSong } from "./designSongs.js";
	import { SONG_START_SECONDS } from "./songTime.js";
	import { readDesignUrlState } from "./designUrlState.js";
	import { syncDesignUrlState } from "./designUrlSync.svelte.js";
	import {
		isTypingTarget,
		playerActionFor,
		type PlayerAction
	} from "./playerShortcuts.js";
	import { createWaveform } from "./waveform.svelte.js";
	import { cropPeaksToFraction } from "./waveformPeaks.js";

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
	const visibleDuration = $derived(chordTimings.visibleDuration);
	const progressFraction = $derived(
		progressFractionOf(currentTime, visibleDuration)
	);
	const visibleWaveformPeaks = $derived(
		waveform.peaks &&
			cropPeaksToFraction(
				waveform.peaks,
				progressFractionOf(visibleDuration, duration)
			)
	);

	function stopAtVisibleEnd() {
		if (currentTime >= visibleDuration) paused = true;
	}

	function togglePlayback() {
		if (paused && currentTime >= visibleDuration) {
			currentTime = SONG_START_SECONDS;
		}
		paused = !paused;
	}

	function restart() {
		currentTime = SONG_START_SECONDS;
		paused = false;
	}

	function seekToSeconds(seconds: number) {
		if (!Number.isFinite(visibleDuration)) return;
		currentTime = Math.min(
			Math.max(seconds, SONG_START_SECONDS),
			visibleDuration
		);
	}

	function seekTo(fraction: number) {
		seekToSeconds(fraction * visibleDuration);
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
			file={chordTimings.file}
			targetFilePath={chordBeatsFilePath(song.songKey)}
			hasLocalEdits={chordTimings.hasLocalEdits}
			onDiscardLocalEdits={chordTimings.discardLocalEdits}
		/>
	</div>
	<div class="tools">
		<PlayerShortcutsHint />
		<AlignmentControls
			startSeconds={chordTimings.startSeconds}
			beatsPerMinute={chordTimings.beatsPerMinute}
			onStartSecondsChange={chordTimings.setStartSeconds}
			onBeatsPerMinuteChange={chordTimings.setBeatsPerMinute}
			onStartAtPlayhead={() => chordTimings.setStartSeconds(currentTime)}
			endSongAtBeat={chordTimings.endSongAtBeat}
			hidesAfterSongEnd={chordTimings.hidesAfterSongEnd}
			onEndSongAtBeatChange={chordTimings.setEndSongAtBeat}
			onToggleHidesAfterSongEnd={chordTimings.toggleHidesAfterSongEnd}
		/>
	</div>
	<ChordTimeline
		timeline={chordTimings.timeline}
		waveformPeaks={visibleWaveformPeaks}
		beatFractions={chordTimings.beatFractions}
		hiddenBeatCount={chordTimings.hiddenBeatCount}
		chordBeats={chordTimings.chordBeats}
		{progressFraction}
		duration={visibleDuration}
		editable={chordTimings.editable}
		{zoom}
		onZoomChange={(nextZoom) => (zoom = nextZoom)}
		onSeek={seekTo}
		onChordEditStart={chordTimings.beginEdit}
		onChordMove={chordTimings.moveChord}
		onChordNudge={chordTimings.nudgeChord}
	/>
	<audio
		bind:paused
		bind:currentTime
		bind:duration
		ontimeupdate={stopAtVisibleEnd}
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

	.tools {
		display: flex;
		flex-wrap: wrap;
		align-items: stretch;
		gap: 0.75rem;
	}

	.header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
</style>
