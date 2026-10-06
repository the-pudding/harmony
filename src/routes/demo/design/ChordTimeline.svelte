<script lang="ts">
	import { isActiveAt, type ChordTimeline } from "./chordTimeline.js";

	const MIN_CHORD_SLOT_REM = 1;
	const PERCENT = 100;

	type Props = {
		timeline: ChordTimeline;
		progressFraction: number;
		onSeek: (fraction: number) => void;
	};

	let { timeline, progressFraction, onSeek }: Props = $props();

	const toPercent = (fraction: number): string => `${fraction * PERCENT}%`;

	const spanStyle = (span: { startFraction: number; endFraction: number }) =>
		`left: ${toPercent(span.startFraction)}; width: ${toPercent(span.endFraction - span.startFraction)};`;

	const trackMinWidth = $derived(
		`${timeline.chords.length * MIN_CHORD_SLOT_REM}rem`
	);

	function seekFromPointer(event: MouseEvent & { currentTarget: HTMLElement }) {
		const bounds = event.currentTarget.getBoundingClientRect();
		onSeek((event.clientX - bounds.left) / bounds.width);
	}
</script>

<div class="scroller">
	<div class="timeline" style="min-width: {trackMinWidth};">
		<div class="row sections">
			{#each timeline.sections as section (section.key)}
				<span
					class="section"
					class:active={isActiveAt(section, progressFraction)}
					style={spanStyle(section)}>{section.name}</span
				>
			{/each}
		</div>

		<div class="row chords">
			{#each timeline.chords as chord (chord.key)}
				<span
					class="chord"
					class:active={isActiveAt(chord, progressFraction)}
					style={spanStyle(chord)}
					title={chord.roman}>{chord.name}</span
				>
			{/each}
		</div>

		<button
			type="button"
			class="track"
			aria-label="Seek"
			onclick={seekFromPointer}
		>
			{#each timeline.sections as section (section.key)}
				<span class="section-divider" style="left: {toPercent(section.startFraction)};"
				></span>
			{/each}
			<span class="progress" style="width: {toPercent(progressFraction)};"></span>
		</button>

		<span class="playhead" style="left: {toPercent(progressFraction)};"></span>
	</div>
</div>

<style>
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

	.row {
		position: relative;
		height: 1rem;
	}

	.section,
	.chord {
		position: absolute;
		top: 0;
		text-align: center;
		white-space: nowrap;
		color: #71717a;
		transition: color 0.1s ease;
	}

	.section {
		text-align: left;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 0.625rem;
		text-transform: lowercase;
		border-left: 1px solid rgba(63, 63, 70, 0.9);
		padding-left: 0.25rem;
		box-sizing: border-box;
	}

	.section.active {
		color: #d4d4d8;
	}

	.chord {
		font-size: 0.6875rem;
	}

	.chord.active {
		color: #818cf8;
		font-weight: 700;
	}

	.track {
		position: relative;
		display: block;
		width: 100%;
		height: 0.5rem;
		padding: 0;
		border: none;
		border-radius: 9999px;
		background: rgba(63, 63, 70, 0.6);
		cursor: pointer;
		overflow: hidden;
	}

	.section-divider {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1px;
		background: rgba(9, 9, 11, 0.8);
	}

	.progress {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		background: rgba(99, 102, 241, 0.55);
		pointer-events: none;
	}

	.playhead {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		margin-left: -1px;
		background: #f4f4f5;
		pointer-events: none;
	}
</style>
