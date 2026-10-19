<script lang="ts">
	import type { SyncedSongRegion } from "$data/syncedSongs.js";
	import { onMount, untrack } from "svelte";
	import MidiConnectStatus from "../../../chord-search-demo/MidiConnectStatus.svelte";
	import {
		romanTokenForChord,
		type MusicalKey
	} from "../../../chord-processing/chordInKey.js";
	import { formatChordName } from "../../../chord-processing/formatChordDisplay.js";
	import { createMidiNoteInput } from "../shared/midiNoteInput.svelte.js";
	import { createChordRecorder } from "./chordRecorder.svelte.js";
	import type { RecordedChord } from "./syncedTimings.js";

	type Props = {
		musicalKey: MusicalKey;
		region: SyncedSongRegion;
		paused: boolean;
		playheadSeconds: number;
		readPlaybackSeconds: () => number;
		onPassStart: (fromSeconds: number) => void;
		onChordChange: (change: RecordedChord, seconds: number) => void;
		onFollow: (seconds: number) => void;
		onPassEnd: (seconds: number) => void;
	};

	let {
		musicalKey,
		region,
		paused,
		playheadSeconds,
		readPlaybackSeconds,
		onPassStart,
		onChordChange,
		onFollow,
		onPassEnd
	}: Props = $props();

	const recorder = createChordRecorder({
		getKey: () => musicalKey,
		getRegion: () => region,
		isPlaying: () => !paused,
		readPlaybackSeconds: () => readPlaybackSeconds(),
		onPassStart: (fromSeconds) => onPassStart(fromSeconds),
		onChordChange: (change, seconds) => onChordChange(change, seconds),
		onFollow: (seconds) => onFollow(seconds),
		onPassEnd: (seconds) => onPassEnd(seconds)
	});

	const midi = createMidiNoteInput(recorder.noteOn);

	$effect(() => {
		const seconds = playheadSeconds;
		untrack(() => recorder.follow(seconds));
	});

	const lastChordLabel = $derived(
		recorder.lastChord &&
			`${formatChordName(recorder.lastChord)} · ${romanTokenForChord(recorder.lastChord, musicalKey)}`
	);

	const status = $derived.by(() => {
		if (recorder.ignoredOutsideRegion)
			return "ignored a chord outside the region";
		if (!recorder.recording)
			return "play a chord, or just its bass note, to check it";
		if (paused) return "paused — press play to keep recording";
		return "recording — play each chord change";
	});

	onMount(() => void midi.connect());
</script>

<div class="recorder">
	<span class="heading">Record chords</span>
	<MidiConnectStatus
		isConnected={midi.isConnected}
		selectedInputName={midi.inputName}
		connectError={midi.connectError}
		onConnect={midi.connect}
	/>
	<button
		type="button"
		class="record"
		aria-pressed={recorder.recording}
		disabled={!midi.isConnected}
		onclick={recorder.toggle}
	>
		{recorder.recording ? "stop recording" : "record"}
	</button>
	{#if lastChordLabel}
		<span class="last-chord" title="Last chord played">{lastChordLabel}</span>
	{/if}
	<span class="status" aria-live="polite">{status}</span>
</div>

<style>
	.recorder {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.75rem;
		width: fit-content;
		padding: 0.5rem 0.75rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.6);
		font-size: 0.6875rem;
		color: #a1a1aa;
	}

	.heading {
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}

	.record {
		padding: 0.25rem 0.5rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.375rem;
		background: #18181b;
		color: #f4f4f5;
		font: inherit;
		cursor: pointer;
	}

	.record:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.record[aria-pressed="true"] {
		border-color: #f87171;
		background: rgba(248, 113, 113, 0.15);
		color: #fca5a5;
	}

	.last-chord {
		padding: 0.125rem 0.5rem;
		border-radius: 0.375rem;
		background: rgba(129, 140, 248, 0.15);
		color: #c7d2fe;
		font-weight: 600;
	}

	.status {
		color: #d4d4d8;
	}
</style>
