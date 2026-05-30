<script lang="ts">
	import Pencil from "@lucide/svelte/icons/pencil";
	import type { Note } from "../../chord-processing/types.js";
	import {
		BLACK_KEY_WIDTH_RATIO,
		BASS_LABEL_COLOR,
		PIANO_KEYS,
		TOTAL_WHITE_KEYS,
		splitNoteToMidi,
		noteToMidiNumber
	} from "./pianoKeys.js";
	import PianoKey from "./PianoKey.svelte";

	type Props = {
		activeNotes: Note[];
		splitNote?: string;
		splitNoteEditing?: boolean;
		splitNoteEditTooltip?: string;
		onSplitEditToggle?: () => void;
		onSplitNotePick?: (midi: number) => void;
	};

	const {
		activeNotes,
		splitNote = "C4",
		splitNoteEditing = false,
		splitNoteEditTooltip = "",
		onSplitEditToggle,
		onSplitNotePick
	}: Props = $props();

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

<div class="piano-container" style:--bass-label-color={BASS_LABEL_COLOR}>
	<div class="section-labels">
		<div class="section-label bass-label" style="width: {bassWidth}%">← Bass</div>
		<div class="split-edit" style="left: {bassWidth}%">
			<button
				type="button"
				class="split-edit-button"
				class:active={splitNoteEditing}
				aria-label="Edit bass and treble split"
				aria-pressed={splitNoteEditing}
				onclick={() => onSplitEditToggle?.()}
			>
				<Pencil size={10} strokeWidth={2} />
			</button>
			{#if splitNoteEditing}
				<p class="split-tooltip" role="status">{splitNoteEditTooltip}</p>
			{/if}
		</div>
		<div class="section-label treble-label" style="width: {trebleWidth}%">Treble →</div>
	</div>
	<div class="keys-wrapper" class:split-editing={splitNoteEditing}>
		{#each PIANO_KEYS as key (key.midi)}
			<PianoKey
				keyData={key}
				isActive={activeMidiSet.has(key.midi)}
				isSplit={key.midi === splitMidi}
				totalWhiteKeys={TOTAL_WHITE_KEYS}
				blackKeyWidthRatio={BLACK_KEY_WIDTH_RATIO}
				onSelect={splitNoteEditing ? () => onSplitNotePick?.(key.midi) : undefined}
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
		position: relative;
	}

	.split-edit {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		z-index: 3;
	}

	.split-edit-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		padding: 0;
		border: 1px solid rgba(113, 113, 122, 0.6);
		border-radius: 999px;
		background: rgba(24, 24, 27, 0.9);
		color: #a1a1aa;
		cursor: pointer;
	}

	.split-edit-button:hover,
	.split-edit-button.active {
		color: #fbbf24;
		border-color: rgba(251, 191, 36, 0.6);
	}

	.split-tooltip {
		position: absolute;
		top: calc(100% + 6px);
		width: 14rem;
		margin: 0;
		padding: 0.5rem 0.625rem;
		border-radius: 0.375rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		background: rgba(24, 24, 27, 0.98);
		color: #e4e4e7;
		font-size: 10px;
		line-height: 1.4;
		text-transform: none;
		letter-spacing: normal;
		text-align: center;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
	}

	.keys-wrapper.split-editing {
		outline: 1px solid rgba(251, 191, 36, 0.35);
		outline-offset: 2px;
		border-radius: 4px;
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
		padding-right: 8px;
		color: var(--bass-label-color);
	}

	.treble-label {
		justify-content: flex-start;
		padding-left: 8px;
		color: #34d399;
	}

	.keys-wrapper {
		position: relative;
		height: 130px;
		width: 100%;
	}
</style>
