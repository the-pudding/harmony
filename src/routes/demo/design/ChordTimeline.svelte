<script lang="ts">
	import { tick } from "svelte";
	import ChordGooeyLane from "./ChordGooeyLane.svelte";
	import ChordRow from "./ChordRow.svelte";
	import ChordWatercolorLane from "./ChordWatercolorLane.svelte";
	import Waveform from "./Waveform.svelte";
	import ZoomControls from "./ZoomControls.svelte";
	import type { KeyTonality } from "./chord-viz/diatonicChords.js";
	import { LANE_BACKGROUND_BLACK, laneChordsOf } from "./chordLanes.js";
	import { isActiveAt, type ChordTimeline } from "./chordTimeline.js";
	import { formatTimestamp } from "./songTime.js";
	import type { RegionEdge } from "./syncedTimings.js";
	import { pointerFractionOf, spanStyle, toPercent } from "./timelineStyles.js";
	import { canStepZoom, steppedZoom } from "./timelineZoom.js";

	const MIN_CHORD_SLOT_REM = 1.75;
	const PLAYHEAD_VIEWPORT_ANCHOR = 0.25;
	const ZOOM_IN_STEP = 1;
	const ZOOM_OUT_STEP = -1;
	const REGION_KEY_STEP_FRACTION = 0.002;
	const REGION_EDGES: RegionEdge[] = ["start", "end"];

	type RegionFractions = {
		startFraction: number;
		endFraction: number;
	};

	type Props = {
		timeline: ChordTimeline;
		tonality: KeyTonality;
		waveformPeaks: number[] | null;
		progressFraction: number;
		secondsAt: (fraction: number) => number;
		editable: boolean;
		region?: RegionFractions | null;
		onRegionEditStart?: () => void;
		onRegionEdgeMove?: (edge: RegionEdge, fraction: number) => void;
		zoom: number;
		onZoomChange: (zoom: number) => void;
		onSeek: (fraction: number) => void;
		onChordEditStart: () => void;
		onChordMove: (index: number, startFraction: number) => void;
		onChordNudge: (index: number, secondsDelta: number) => void;
		onChordDelete: (index: number) => void;
	};

	let {
		timeline,
		tonality,
		waveformPeaks,
		progressFraction,
		secondsAt,
		editable,
		region = null,
		onRegionEditStart,
		onRegionEdgeMove,
		zoom,
		onZoomChange,
		onSeek,
		onChordEditStart,
		onChordMove,
		onChordNudge,
		onChordDelete
	}: Props = $props();

	let scroller = $state<HTMLDivElement>();
	let regionDrag = $state<{ edge: RegionEdge; track: DOMRect } | null>(null);

	const regionFractionOf = (edge: RegionEdge, area: RegionFractions) =>
		edge === "start" ? area.startFraction : area.endFraction;

	function startRegionDrag(
		event: PointerEvent & { currentTarget: HTMLElement },
		edge: RegionEdge
	) {
		const track = event.currentTarget.parentElement?.getBoundingClientRect();
		if (!track) return;
		event.currentTarget.setPointerCapture(event.pointerId);
		onRegionEditStart?.();
		regionDrag = { edge, track };
	}

	function continueRegionDrag(event: PointerEvent) {
		if (!regionDrag) return;
		const { edge, track } = regionDrag;
		onRegionEdgeMove?.(edge, (event.clientX - track.left) / track.width);
	}

	function nudgeRegionEdge(event: KeyboardEvent, edge: RegionEdge) {
		if (!region) return;
		const direction =
			event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
		if (direction === 0) return;
		event.preventDefault();
		event.stopPropagation();
		onRegionEditStart?.();
		onRegionEdgeMove?.(
			edge,
			regionFractionOf(edge, region) + direction * REGION_KEY_STEP_FRACTION
		);
	}
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
				{secondsAt}
				{editable}
				{onChordEditStart}
				{onChordMove}
				{onChordNudge}
				{onChordDelete}
			/>

			<div class="track-area">
				<button
					type="button"
					class="track"
					aria-label="Seek"
					onclick={(event) => onSeek(pointerFractionOf(event))}
				>
					{#if waveformPeaks}
						<Waveform peaks={waveformPeaks} />
					{/if}
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
				{#if region}
					<span
						class="outside-region"
						style="left: 0; width: {toPercent(region.startFraction)};"
					></span>
					<span
						class="outside-region"
						style="left: {toPercent(region.endFraction)}; right: 0;"
					></span>
					{#each REGION_EDGES as edge (edge)}
						{@const fraction = regionFractionOf(edge, region)}
						<span
							class="region-handle"
							class:dragging={regionDrag?.edge === edge}
							role="slider"
							tabindex="0"
							aria-label="Region {edge}"
							aria-valuemin={0}
							aria-valuemax={100}
							aria-valuenow={Math.round(fraction * 100)}
							aria-valuetext={formatTimestamp(secondsAt(fraction))}
							title="Drag to move the region {edge}"
							style="left: {toPercent(fraction)};"
							onpointerdown={(event) => startRegionDrag(event, edge)}
							onpointermove={continueRegionDrag}
							onpointerup={() => (regionDrag = null)}
							onpointercancel={() => (regionDrag = null)}
							onkeydown={(event) => nudgeRegionEdge(event, edge)}
						></span>
					{/each}
				{/if}
			</div>

			<ChordWatercolorLane chords={laneChords} {progressFraction} {onSeek} />
			<ChordGooeyLane chords={laneChords} {progressFraction} {onSeek} />
			<ChordGooeyLane
				chords={laneChords}
				{progressFraction}
				{onSeek}
				background={LANE_BACKGROUND_BLACK}
			/>

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

	.chord-start,
	.section-divider {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1px;
		pointer-events: none;
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

	.track-area {
		position: relative;
	}

	.outside-region {
		position: absolute;
		top: 0;
		bottom: 0;
		background: rgba(9, 9, 11, 0.6);
		pointer-events: none;
	}

	.region-handle {
		position: absolute;
		top: -0.25rem;
		bottom: -0.25rem;
		width: 0.625rem;
		margin-left: -0.3125rem;
		cursor: ew-resize;
		touch-action: none;
		z-index: 2;
	}

	.region-handle::after {
		content: "";
		position: absolute;
		top: 0;
		bottom: 0;
		left: 50%;
		width: 3px;
		margin-left: -1.5px;
		border-radius: 2px;
		background: #fcd34d;
	}

	.region-handle:hover::after,
	.region-handle:focus-visible::after,
	.region-handle.dragging::after {
		width: 5px;
		margin-left: -2.5px;
		box-shadow: 0 0 6px rgba(252, 211, 77, 0.8);
	}

	.region-handle:focus-visible {
		outline: none;
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
