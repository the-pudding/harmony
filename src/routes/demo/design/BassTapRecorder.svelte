<script lang="ts">
	import { onMount } from "svelte";
	import MidiConnectStatus from "../../../chord-search-demo/MidiConnectStatus.svelte";
	import { createMidiNoteInput } from "../shared/midiNoteInput.svelte.js";
	import { bassTapStatus, type BassTap } from "./bassTaps.js";
	import { createBassTapRecorder } from "./bassTapRecorder.svelte.js";

	type Props = {
		chordNames: string[];
		chordStartSeconds: number[];
		paused: boolean;
		readPlaybackSeconds: () => number;
		onRecordingStart: () => void;
		onChordTap: (tap: BassTap) => void;
	};

	let {
		chordNames,
		chordStartSeconds,
		paused,
		readPlaybackSeconds,
		onRecordingStart,
		onChordTap
	}: Props = $props();

	const recorder = createBassTapRecorder({
		getChordStartSeconds: () => chordStartSeconds,
		onRecordingStart: () => onRecordingStart(),
		onChordTap: (tap) => onChordTap(tap)
	});

	const midi = createMidiNoteInput(() => {
		if (!paused) recorder.tap(readPlaybackSeconds());
	});

	const status = $derived(
		bassTapStatus(recorder.recording, recorder.lastTap, chordNames)
	);

	onMount(() => void midi.connect());
</script>

<div class="bass-taps">
	<span class="heading">Bass tap timing</span>
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
	<span class="status" aria-live="polite">{status}</span>
</div>

<style>
	.bass-taps {
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

	.status {
		color: #71717a;
	}
</style>
