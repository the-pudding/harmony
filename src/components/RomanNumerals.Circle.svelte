<script>
	import ChordCard from "$components/RomanNumerals.Chord.svelte";
	import {
		diatonicChordsOf,
		tonalityOfScale
	} from "$routes/demo/design/chord-viz/diatonicChords.js";
	import { diatonicQualityForDegree } from "../chord-processing/diatonicQuality.js";
	import {
		NOTE_NAMES,
		noteNameToPitchClass
	} from "../chord-processing/chord-classifier/notes.js";
	import { SCALE_INTERVALS } from "../chord-processing/scale-intervals.js";
	import { parseRomanToken } from "../chord-processing/romanNumerals.js";

	let {
		key,
		symbols,
		labelHome = true,
		scale = "major",
		progression = ["I", "V", "vi", "IV"],
		// seconds into the playing audio, null when not playing
		playTime = null,
		chordDuration = 1.5
	} = $props();

	const SIZE = 400;
	const R = 180;
	const NODE_R = 32;
	const SUFFIXES = { maj: "", min: "m", dim: "°", aug: "+" };

	const tonality = $derived(tonalityOfScale(scale));

	const chords = $derived.by(() => {
		const tonic = noteNameToPitchClass(key);
		const intervals = SCALE_INTERVALS[scale];
		return diatonicChordsOf(scale).map(({ degree, roman }, i) => {
			const quality = diatonicQualityForDegree(scale, degree);
			const root = NOTE_NAMES[(tonic + intervals[i]) % 12];
			const angle = (i / intervals.length) * Math.PI * 2 - Math.PI / 2;
			return {
				degree,
				roman,
				letter: root[0],
				marker: `${root.slice(1)}${SUFFIXES[quality] ?? ""}`,
				x: SIZE / 2 + Math.cos(angle) * R,
				y: SIZE / 2 + Math.sin(angle) * R
			};
		});
	});

	const links = $derived(
		chords.map((from, i) => {
			const to = chords[(i + 1) % chords.length];
			const dx = to.x - from.x;
			const dy = to.y - from.y;
			const len = Math.hypot(dx, dy);
			const ux = dx / len;
			const uy = dy / len;
			const gap = NODE_R + 4;
			return {
				id: `${from.degree}-${to.degree}`,
				d: `M${from.x + ux * gap},${from.y + uy * gap} A${R},${R} 0 0 1 ${to.x - ux * gap},${to.y - uy * gap}`
			};
		})
	);

	const LINE_WIDTH = 8;
	const HEAD_LENGTH = LINE_WIDTH * 2.75;
	const HEAD_WIDTH = LINE_WIDTH * 1.75;

	const stops = $derived(
		progression
			.map((token) => chords[(parseRomanToken(token)?.degree ?? 0) - 1])
			.filter(Boolean)
	);

	// one arrow per step of the progression and back home
	const steps = $derived.by(() => {
		if (stops.length < 2) return [];
		const loop = [...stops, stops[0]];
		return loop.slice(1).map((to, i) => {
			const from = loop[i];
			const dx = to.x - from.x;
			const dy = to.y - from.y;
			const len = Math.hypot(dx, dy);
			const ux = dx / len;
			const uy = dy / len;
			const gap = NODE_R + 4;
			const x1 = from.x + ux * gap;
			const y1 = from.y + uy * gap;
			const x2 = to.x - ux * gap;
			const y2 = to.y - uy * gap;
			const bx = x2 - ux * HEAD_LENGTH;
			const by = y2 - uy * HEAD_LENGTH;
			return {
				// line ends at the arrowhead's base so it doesn't poke through the tip
				line: `M${x1},${y1} L${bx},${by}`,
				head: `M${x2},${y2} L${bx - uy * HEAD_WIDTH},${by + ux * HEAD_WIDTH} L${bx + uy * HEAD_WIDTH},${by - ux * HEAD_WIDTH} Z`,
				// head starts at the line's start and rides its tip to the end
				headDx: x1 - bx,
				headDy: y1 - by
			};
		});
	});

	// seconds each arrow takes, ending right as the next chord starts
	const TRANSITION_DURATION = 0.3;

	const easeInOut = (t) =>
		t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

	// fully drawn when idle; while playing, each arrow snaps across at the end of its chord
	const progressOf = (i) => {
		if (playTime === null) return 1;
		const start = (i + 1) * chordDuration - TRANSITION_DURATION;
		const t = (playTime - start) / TRANSITION_DURATION;
		return easeInOut(Math.min(1, Math.max(0, t)));
	};

	const activeDegree = $derived.by(() => {
		if (playTime === null || playTime < 0) return null;
		return stops[Math.floor(playTime / chordDuration)]?.degree ?? null;
	});
</script>

<div class="circle">
	<div class="square">
		<svg
			viewBox="0 0 {SIZE} {SIZE}"
			role="img"
			aria-label="Diatonic chords of {key} {scale}: {chords
				.map((d) => d.letter + d.marker)
				.join(', ')}"
		>
			{#each links as { id, d } (id)}
				<path class="link" {d} />
			{/each}

			{#each steps as { line, head, headDx, headDy }, i}
				{@const p = progressOf(i)}
				<path
					class="arrow-line"
					d={line}
					pathLength="1"
					stroke-width={LINE_WIDTH}
					style:stroke-dashoffset={1 - p}
				/>
				<path
					class="arrow-head"
					d={head}
					style:opacity={p > 0 ? null : 0}
					style:transform={p === 1
						? null
						: `translate(${headDx * (1 - p)}px, ${headDy * (1 - p)}px)`}
				/>
			{/each}
		</svg>

		<!-- html over the svg so the cards can flip in 3d -->
		{#each chords as { degree, roman, letter, marker, x, y } (degree)}
			<div
				class="label"
				class:active={degree === activeDegree}
				class:dimmed={activeDegree !== null && degree !== activeDegree}
				style:left="{(x / SIZE) * 100}%"
				style:top="{(y / SIZE) * 100}%"
			>
				{#if labelHome && degree === 1}
					<span class="home" aria-hidden="true"
						><span class="home-tag">home</span></span
					>
				{/if}
				<ChordCard {degree} {roman} {tonality} {letter} {marker} {symbols} />
			</div>
		{/each}
	</div>
</div>

<style>
	.circle {
		flex: 1;
		min-height: 0;
		width: 100%;
		display: flex;
		justify-content: center;
		container-type: size;
	}

	/* largest square that fits; labels are positioned in % of it */
	.square {
		position: relative;
		width: min(100cqw, 100cqh);
		aspect-ratio: 1;
		container-type: inline-size;
	}

	svg {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
	}

	.link {
		fill: none;
		stroke: currentColor;
		stroke-width: 1.5;
		opacity: 0.4;
	}

	.arrow-line {
		fill: none;
		stroke: currentColor;
		opacity: 0.8;
		stroke-dasharray: 1;
	}

	.arrow-head {
		fill: currentColor;
		opacity: 0.8;
	}

	/* sizes in cqw of .square so they scale like the svg did (24 of 400 units → 6cqw) */
	.label {
		position: absolute;
		width: 16cqw;
		height: 16cqw;
		font-size: 6cqw;
		transform: translate(-50%, -50%);
		transition:
			transform 0.2s ease-out,
			opacity 0.2s;
	}

	.label.active {
		transform: translate(-50%, -50%) scale(1.5);
		z-index: 1;
	}

	.label.dimmed {
		opacity: 0.2;
	}

	/* outline around the I chord, with a small tag sitting above it */
	.home {
		position: absolute;
		inset: -1cqw;
		/* opaque fill hides the circle lines; behind the card within .label */
		z-index: -1;
		background: var(--color-bg);
		border: 1.5px solid color-mix(in srgb, currentColor 50%, transparent);
		pointer-events: none;
	}

	.home-tag {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translate(-50%, -0.75cqw);
		font-family: var(--font-mono);
		font-size: 3.5cqw;
		opacity: 0.5;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		white-space: nowrap;
	}
</style>
