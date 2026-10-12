<script lang="ts">
	import { BEATS_PER_CHORD } from "./beatGrid.js";
	import { BEAT_SNAP } from "./chordBeats.js";
	import {
		isActiveAt,
		type TimelineChord,
		type TimelineGroup
	} from "./chordTimeline.js";
	import { formatTimestamp } from "./songTime.js";
	import { spanStyle, toPercent } from "./timelineStyles.js";

	const NUDGE_DIRECTION_BY_KEY: Record<string, number> = {
		ArrowLeft: -1,
		ArrowRight: 1
	};

	type Props = {
		chords: TimelineChord[];
		groups: TimelineGroup[];
		chordBeats: number[];
		progressFraction: number;
		duration: number;
		editable: boolean;
		onChordEditStart: () => void;
		onChordMove: (index: number, startFraction: number) => void;
		onChordNudge: (index: number, beatDelta: number) => void;
	};

	let {
		chords,
		groups,
		chordBeats,
		progressFraction,
		duration,
		editable,
		onChordEditStart,
		onChordMove,
		onChordNudge
	}: Props = $props();

	type ChordDrag = {
		index: number;
		pointerStartX: number;
		startFraction: number;
		rowWidth: number;
	};

	let drag = $state<ChordDrag | null>(null);
	let row = $state<HTMLDivElement>();

	const draggedChord = $derived(drag === null ? undefined : chords[drag.index]);

	const chordPosition = (chord: TimelineChord): string =>
		`beat ${chordBeats[chord.index]} · ${formatTimestamp(chord.startFraction * duration)}`;

	const chordTitle = (chord: TimelineChord): string =>
		editable ? `${chord.roman} · ${chordPosition(chord)}` : chord.roman;

	function startDrag(
		event: PointerEvent & { currentTarget: HTMLElement },
		chord: TimelineChord
	) {
		if (!editable || !row) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		onChordEditStart();
		drag = {
			index: chord.index,
			pointerStartX: event.clientX,
			startFraction: chord.startFraction,
			rowWidth: row.getBoundingClientRect().width
		};
	}

	function continueDrag(event: PointerEvent) {
		if (!drag) return;
		onChordMove(
			drag.index,
			drag.startFraction + (event.clientX - drag.pointerStartX) / drag.rowWidth
		);
	}

	function endDrag() {
		drag = null;
	}

	function nudge(event: KeyboardEvent, chord: TimelineChord) {
		const direction = NUDGE_DIRECTION_BY_KEY[event.key];
		if (!editable || direction === undefined) return;
		event.preventDefault();
		const nudgeBeats = event.shiftKey ? BEATS_PER_CHORD : BEAT_SNAP;
		onChordNudge(chord.index, direction * nudgeBeats);
	}
</script>

<div class="row" bind:this={row}>
	{#each groups as group (group.key)}
		<span
			class="group"
			class:dashed={group.isStrictSubset}
			style="{spanStyle(group)} --group-border: {group.palette.border};"
			title={group.chordProgression}
		></span>
	{/each}
	{#each chords as chord (chord.key)}
		<button
			type="button"
			class="chord"
			class:editable
			class:grouped={chord.palette !== null}
			class:active={isActiveAt(chord, progressFraction)}
			class:dragging={drag?.index === chord.index}
			style="{spanStyle(chord)} --chord-fill: {chord.palette
				?.fill}; --chord-active-fill: {chord.palette?.border};"
			title={chordTitle(chord)}
			aria-label="{chord.name} chord start, {chordTitle(chord)}"
			onpointerdown={(event) => startDrag(event, chord)}
			onpointermove={continueDrag}
			onpointerup={endDrag}
			onpointercancel={endDrag}
			onkeydown={(event) => nudge(event, chord)}>{chord.name}</button
		>
	{/each}
	{#if draggedChord}
		<span
			class="drag-time"
			style="left: {toPercent(draggedChord.startFraction)};"
			>{chordPosition(draggedChord)}</span
		>
	{/if}
</div>

<style>
	.row {
		position: relative;
		height: 1.375rem;
	}

	.chord,
	.group {
		position: absolute;
		top: 0;
		bottom: 0;
		box-sizing: border-box;
	}

	.group {
		border: 1px solid var(--group-border);
		border-radius: 0.375rem;
	}

	.group.dashed {
		border-style: dashed;
	}

	.chord {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: 2px solid transparent;
		border-radius: 0.3125rem;
		background: transparent;
		background-clip: padding-box;
		font: inherit;
		font-size: 0.625rem;
		white-space: nowrap;
		color: #71717a;
		transition:
			color 0.1s ease,
			background-color 0.1s ease;
	}

	.chord.editable {
		cursor: ew-resize;
		touch-action: none;
		box-shadow: inset 1px 0 0 rgba(244, 244, 245, 0.35);
	}

	.chord.grouped {
		background-color: var(--chord-fill);
		color: #d4d4d8;
	}

	.chord.active {
		color: #818cf8;
		font-weight: 700;
	}

	.chord.grouped.active {
		background-color: var(--chord-active-fill);
		color: #fff;
	}

	.chord.dragging {
		box-shadow: inset 2px 0 0 #f4f4f5;
		z-index: 1;
	}

	.drag-time {
		position: absolute;
		bottom: 100%;
		margin-bottom: 0.25rem;
		padding: 0 0.25rem;
		border-radius: 0.25rem;
		background: #f4f4f5;
		color: #09090b;
		font-size: 0.625rem;
		white-space: nowrap;
		pointer-events: none;
		z-index: 2;
	}
</style>
