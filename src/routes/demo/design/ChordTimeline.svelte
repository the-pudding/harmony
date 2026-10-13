<script lang="ts">
	import { tick } from "svelte";
	import ChordGooeyLane from "./ChordGooeyLane.svelte";
	import ChordRow from "./ChordRow.svelte";
	import ChordWatercolorLane from "./ChordWatercolorLane.svelte";
	import Waveform from "./Waveform.svelte";
	import ZoomControls from "./ZoomControls.svelte";
	import type { KeyTonality } from "./chord-viz/diatonicChords.js";
	import { laneChordsOf } from "./chordLanes.js";
	import { isActiveAt, type ChordTimeline } from "./chordTimeline.js";
	import { pointerFractionOf, spanStyle, toPercent } from "./timelineStyles.js";
	import { canStepZoom, steppedZoom } from "./timelineZoom.js";

	const MIN_CHORD_SLOT_REM = 1.75;
	const PLAYHEAD_VIEWPORT_ANCHOR = 0.25;
	const ZOOM_IN_STEP = 1;
	const ZOOM_OUT_STEP = -1;

	type Props = {
		timeline: ChordTimeline;
		tonality: KeyTonality;
		waveformPeaks: number[] | null;
		beatFractions: number[];
		hiddenBeatCount: number;
		chordBeats: number[];
		progressFraction: number;
		duration: number;
		editable: boolean;
		zoom: number;
		onZoomChange: (zoom: number) => void;
		onSeek: (fraction: number) => void;
		onChordEditStart: () => void;
		onChordMove: (index: number, startFraction: number) => void;
		onChordNudge: (index: number, beatDelta: number) => void;
	};

	let {
		timeline,
		tonality,
		waveformPeaks,
		beatFractions,
		hiddenBeatCount,
		chordBeats,
		progressFraction,
		duration,
		editable,
		zoom,
		onZoomChange,
		onSeek,
		onChordEditStart,
		onChordMove,
		onChordNudge
	}: Props = $props();

	let scroller = $state<HTMLDivElement>();

	const isTruncated = $derived(hiddenBeatCount > 0);
	const laneChords = $derived(laneChordsOf(timeline, tonality));

	const trackMinWidth = $derived(
		`${timeline.chords.length * MIN_CHORD_SLOT_REM}rem`
	);

	const isPlayheadVisible = (element: HTMLDivElement): boolean => {
		const playheadX = progressFraction * element.scrollWidth;
		return (
			playheadX >= element.scrollLeft &&
			playheadX <= element.scrollLeft + element.clientWidth
		);
	};

	const scrollToPlayhead = (element: HTMLDivElement) => {
		element.scrollLeft =
			progressFraction * element.scrollWidth -
			element.clientWidth * PLAYHEAD_VIEWPORT_ANCHOR;
	};

	$effect(() => {
		if (!scroller || isPlayheadVisible(scroller)) return;
		scrollToPlayhead(scroller);
	});

	async function changeZoom(step: number) {
		onZoomChange(steppedZoom(zoom, step));
		await tick();
		if (scroller) scrollToPlayhead(scroller);
	}
</script>

<div class="chord-timeline">
	<ZoomControls
		{zoom}
		canZoomOut={canStepZoom(zoom, ZOOM_OUT_STEP)}
		canZoomIn={canStepZoom(zoom, ZOOM_IN_STEP)}
		onZoomOut={() => changeZoom(ZOOM_OUT_STEP)}
		onZoomIn={() => changeZoom(ZOOM_IN_STEP)}
	/>

	<div class="scroller" bind:this={scroller}>
		<div
			class="timeline"
			style="width: {toPercent(zoom)}; min-width: {trackMinWidth};"
		>
			<div class="sections">
				{#each timeline.sections as section (section.key)}
					<span
						class="section"
						class:active={isActiveAt(section, progressFraction)}
						style={spanStyle(section)}>{section.name}</span
					>
				{/each}
			</div>

			<ChordRow
				chords={timeline.chords}
				groups={timeline.groups}
				{progressFraction}
				{duration}
				{editable}
				{chordBeats}
				{onChordEditStart}
				{onChordMove}
				{onChordNudge}
			/>

			<button
				type="button"
				class="track"
				class:truncated={isTruncated}
				aria-label="Seek"
				onclick={(event) => onSeek(pointerFractionOf(event))}
			>
				{#if waveformPeaks}
					<Waveform peaks={waveformPeaks} />
				{/if}
				{#each beatFractions as beatFraction (beatFraction)}
					<span class="beat-line" style="left: {toPercent(beatFraction)};"
					></span>
				{/each}
				{#each timeline.chords as chord (chord.key)}
					<span
						class="chord-start"
						style="left: {toPercent(chord.startFraction)};"
					></span>
				{/each}
				{#each timeline.sections as section (section.key)}
					<span
						class="section-divider"
						style="left: {toPercent(section.startFraction)};"
					></span>
				{/each}
				<span class="progress" style="width: {toPercent(progressFraction)};"
				></span>
			</button>

			{#if isTruncated}
				<span class="truncated-mark">
					truncated, hiding {hiddenBeatCount} beats
				</span>
			{/if}

			<ChordWatercolorLane chords={laneChords} {progressFraction} {onSeek} />
			<ChordGooeyLane chords={laneChords} {progressFraction} {onSeek} />

			<span class="playhead" style="left: {toPercent(progressFraction)};"
			></span>
		</div>
	</div>
</div>

<style>
	.chord-timeline {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.scroller {
		overflow-x: auto;
		padding-bottom: 0.25rem;
	}

	.timeline {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.sections {
		position: relative;
		height: 1rem;
	}

	.section {
		position: absolute;
		top: 0;
		box-sizing: border-box;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.625rem;
		text-transform: lowercase;
		color: #71717a;
		border-left: 1px solid rgba(63, 63, 70, 0.9);
		padding-left: 0.25rem;
		transition: color 0.1s ease;
	}

	.section.active {
		color: #d4d4d8;
	}

	.track {
		position: relative;
		display: block;
		width: 100%;
		height: 3.5rem;
		padding: 0;
		border: none;
		border-radius: 0.375rem;
		background: rgba(39, 39, 42, 0.6);
		cursor: pointer;
		overflow: hidden;
	}

	.beat-line,
	.chord-start,
	.section-divider {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1px;
		pointer-events: none;
	}

	.beat-line {
		background: rgba(244, 244, 245, 0.14);
	}

	.chord-start {
		width: 2px;
		margin-left: -1px;
		background: #a5b4fc;
		box-shadow: 0 0 4px rgba(129, 140, 248, 0.8);
	}

	.section-divider {
		background: rgba(244, 244, 245, 0.45);
	}

	.progress {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		background: rgba(99, 102, 241, 0.25);
		pointer-events: none;
	}

	.track.truncated {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
		border-right: 2px dashed #a1a1aa;
	}

	.truncated-mark {
		align-self: flex-end;
		font-size: 0.625rem;
		color: #a1a1aa;
		font-style: italic;
	}

	.playhead {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		margin-left: -1px;
		background: #f4f4f5;
		box-shadow: 0 0 0 1px rgba(9, 9, 11, 0.5);
		pointer-events: none;
		z-index: 1;
	}
</style>
