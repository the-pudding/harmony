<script lang="ts">
	import type { Note } from "../../chord-processing/types.js";
	import {
		PIANO_KEYS,
		TOTAL_WHITE_KEYS,
		BLACK_KEY_WIDTH_RATIO,
		splitNoteToMidi,
		noteToMidiNumber
	} from "./pianoKeys.js";
	import PianoKey from "./PianoKey.svelte";

	type Props = {
		activeNotes: Note[];
		splitNote?: string;
	};

	const { activeNotes, splitNote = "C4" }: Props = $props();

	const splitMidi = $derived(splitNoteToMidi(splitNote));

	const activeMidiSet = $derived(new Set(activeNotes.map(noteToMidiNumber)));

	const splitKeyData = $derived(PIANO_KEYS.find((k) => k.midi === splitMidi));

	const bassWidth = $derived.by(() => {
		if (!splitKeyData) return 50;
		const pos = splitKeyData.whitePosition;
		const whiteIndex = splitKeyData.isBlack ? Math.floor(pos) : pos + 1;
		return (whiteIndex / TOTAL_WHITE_KEYS) * 100;
	});

	const trebleWidth = $derived(100 - bassWidth);
</script>

<div class="piano-container">
	<div class="section-labels">
		<div class="section-label bass-label" style="width: {bassWidth}%">Bass</div>
		<div class="section-label treble-label" style="width: {trebleWidth}%">Treble</div>
	</div>
	<div class="keys-wrapper">
		{#each PIANO_KEYS as key (key.midi)}
			<PianoKey
				keyData={key}
				isActive={activeMidiSet.has(key.midi)}
				isSplit={key.midi === splitMidi}
				totalWhiteKeys={TOTAL_WHITE_KEYS}
				blackKeyWidthRatio={BLACK_KEY_WIDTH_RATIO}
			/>
		{/each}
	</div>
</div>

<style>
	.piano-container {
		background: #0f0f0f;
		border-radius: 8px;
		padding: 8px 12px;
		margin: 0 12px;
	}

	.section-labels {
		display: flex;
		height: 20px;
		margin-bottom: 4px;
	}

	.section-label {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #71717a;
		display: flex;
		align-items: center;
	}

	.bass-label {
		justify-content: flex-end;
		color: #a78bfa;
	}

	.treble-label {
		justify-content: flex-start;
		color: #34d399;
	}

	.keys-wrapper {
		position: relative;
		height: 130px;
		width: 100%;
	}
</style>
