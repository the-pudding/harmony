<script lang="ts">
	import {
		SYNCED_SONG_DATA_DIRECTORY,
		type SyncedSongFile
	} from "$data/syncedSongs.js";
	import ChordRecorder from "./ChordRecorder.svelte";
	import ChordSheet from "./ChordSheet.svelte";
	import ChordTimeline from "./ChordTimeline.svelte";
	import KeyControls from "./KeyControls.svelte";
	import RegionControls from "./RegionControls.svelte";
	import SongPlayerCard from "./SongPlayerCard.svelte";
	import SyncedSongActions from "./SyncedSongActions.svelte";
	import { tonalityOfScale } from "./chord-viz/diatonicChords.js";
	import { currentSearchParams } from "../shared/currentSearchParams.js";
	import type { DesignSong } from "./designSongs.js";
	import { SONG_START_SECONDS } from "./songTime.js";
	import { readDesignUrlState } from "./designUrlState.js";
	import { syncDesignUrlState } from "./designUrlSync.svelte.js";
	import {
		isTypingTarget,
		playerActionFor,
		type PlayerAction
	} from "./playerShortcuts.js";
	import { createSyncedSongTimings } from "./syncedSongTimings.svelte.js";
	import {
		buildSyncedChordTimeline,
		type TimelineView
	} from "./syncedTimings.js";
	import { createWaveform } from "./waveform.svelte.js";
	import { cropPeaksToRange } from "./waveformPeaks.js";

	type Props = {
		song: DesignSong;
		committedFile?: SyncedSongFile;
		editing?: boolean;
		onSaved?: (file: SyncedSongFile) => void;
	};

	let { song, committedFile, editing = false, onSaved }: Props = $props();

	const initialUrlState = readDesignUrlState(currentSearchParams());

	let paused = $state(true);
	let currentTime = $state(initialUrlState.playheadSeconds);
	let duration = $state(NaN);
	let zoom = $state(initialUrlState.zoom);
	let audio = $state<HTMLAudioElement>();

	syncDesignUrlState(() => ({ zoom, playheadSeconds: currentTime }));

	const timings = createSyncedSongTimings(
		() => song,
		() => committedFile,
		() => duration
	);
	const waveform = createWaveform(() => song.audioSrc);

	const region = $derived(timings.region);
	// Editing shows the whole audio so the region can be moved; otherwise
	// only the region, which is the part with chord data.
	const view = $derived<TimelineView>(
		editing || !timings.hasRecordedChords
			? { startSeconds: SONG_START_SECONDS, endSeconds: duration }
			: region
	);
	const viewSeconds = $derived(view.endSeconds - view.startSeconds);

	const fractionOf = (seconds: number): number =>
		Number.isFinite(viewSeconds) && viewSeconds > 0
			? Math.min(Math.max((seconds - view.startSeconds) / viewSeconds, 0), 1)
			: 0;
	const secondsAt = (fraction: number): number =>
		view.startSeconds + fraction * viewSeconds;

	const timeline = $derived(
		buildSyncedChordTimeline(
			timings.section,
			timings.editable ? timings.chords : [],
			region,
			view
		)
	);
	const progressFraction = $derived(fractionOf(currentTime));
	const visibleWaveformPeaks = $derived(
		waveform.peaks &&
			(timings.editable
				? cropPeaksToRange(
						waveform.peaks,
						view.startSeconds / duration,
						view.endSeconds / duration
					)
				: waveform.peaks)
	);
	const regionFractions = $derived(
		editing && timings.editable
			? {
					startFraction: fractionOf(region.startSeconds),
					endFraction: fractionOf(region.endSeconds)
				}
			: null
	);

	const playbackStart = $derived(view.startSeconds);
	const playbackEnd = $derived(view.endSeconds);
	const restartSeconds = $derived(
		timings.editable ? region.startSeconds : SONG_START_SECONDS
	);

	function stopAtPlaybackEnd() {
		if (currentTime >= playbackEnd) paused = true;
	}

	function togglePlayback() {
		if (paused && (currentTime < playbackStart || currentTime >= playbackEnd)) {
			currentTime = playbackStart;
		}
		paused = !paused;
	}

	function restart() {
		currentTime = restartSeconds;
		paused = false;
	}

	const readPlaybackSeconds = (): number => audio?.currentTime ?? currentTime;

	function startRecording(fromSeconds: number) {
		timings.startRecordingPass(fromSeconds);
		paused = false;
	}

	function seekToSeconds(seconds: number) {
		if (!Number.isFinite(playbackEnd)) return;
		currentTime = Math.min(Math.max(seconds, playbackStart), playbackEnd);
	}

	const isActionAvailable = (action: PlayerAction): boolean =>
		editing || action.type !== "undo";

	function runPlayerAction(action: PlayerAction) {
		if (action.type === "togglePlayback") togglePlayback();
		else if (action.type === "restart") restart();
		else if (action.type === "undo") timings.undo();
		else seekToSeconds(currentTime + action.seconds);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (isTypingTarget(event.target)) return;
		const action = playerActionFor(event);
		if (!action || !isActionAvailable(action)) return;
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
		{#if editing}
			<SyncedSongActions
				file={timings.file}
				targetFilePath="{SYNCED_SONG_DATA_DIRECTORY}/{song.songKey}.json"
				canSave={timings.editable}
				hasLocalEdits={timings.hasLocalEdits}
				hasRecordedChords={timings.hasRecordedChords}
				onSaved={(file) => {
					timings.markSaved(file);
					onSaved?.(file);
				}}
				onDiscardLocalEdits={timings.discardLocalEdits}
				onClearChords={timings.clearChords}
			/>
		{/if}
	</div>
	{#if editing}
		<div class="tools">
			<RegionControls
				{region}
				disabled={!timings.editable}
				onSetEdgeToPlayhead={(edge) => timings.setRegionEdge(edge, currentTime)}
			/>
			<KeyControls musicalKey={timings.key} onKeyChange={timings.setKey} />
			<ChordRecorder
				musicalKey={timings.key}
				{region}
				{paused}
				playheadSeconds={currentTime}
				{readPlaybackSeconds}
				onPassStart={startRecording}
				onChordChange={timings.recordChordChange}
				onFollow={timings.followRecordingPass}
				onPassEnd={timings.endRecordingPass}
			/>
		</div>
	{/if}
	{#if editing}
		<ChordSheet sections={song.chordSheet} musicalKey={timings.key} />
	{/if}
	<ChordTimeline
		{timeline}
		tonality={tonalityOfScale(timings.key.scale)}
		waveformPeaks={visibleWaveformPeaks}
		{progressFraction}
		{secondsAt}
		editable={editing && timings.editable}
		region={regionFractions}
		{zoom}
		onZoomChange={(nextZoom) => (zoom = nextZoom)}
		onSeek={(fraction) => seekToSeconds(secondsAt(fraction))}
		onRegionEditStart={timings.beginEdit}
		onRegionEdgeMove={(edge, fraction) =>
			timings.moveRegion(edge, secondsAt(fraction))}
		onChordEditStart={timings.beginEdit}
		onChordMove={(index, fraction) =>
			timings.moveChord(index, secondsAt(fraction))}
		onChordNudge={timings.nudgeChord}
		onChordDelete={timings.deleteChord}
	/>
	<audio
		bind:this={audio}
		bind:paused
		bind:currentTime
		bind:duration
		ontimeupdate={stopAtPlaybackEnd}
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
