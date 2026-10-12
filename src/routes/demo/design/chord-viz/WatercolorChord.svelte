<script lang="ts">
	import type { VizChord } from "./diatonicChords.js";
	import {
		ALPHA_THRESHOLD_MATRIX,
		BLOB_AREA,
		CHORD_SIZE,
		CHORD_TONE_COLORS,
		CHORD_VIEWBOX,
		FILTER_REGION,
		NOISE_ALPHA_MATRIX,
		NOISE_OCTAVES,
		PENCIL_FILTER,
		blobPath,
		thresholdBlurFor,
		type WatercolorSettings
	} from "./watercolor.js";

	type Props = {
		chord: VizChord;
		settings: WatercolorSettings;
	};

	let { chord, settings }: Props = $props();

	const uid = $props.id();
	const splotchId = `splotch-${uid}`;
	const thresholdId = `threshold-${uid}`;
	const pencilId = `pencil-${uid}`;

	const shapePath = $derived(blobPath(chord.seed));
	const colors = $derived(CHORD_TONE_COLORS[chord.tone]);
	const thresholdBlur = $derived(
		thresholdBlurFor(settings.deviation, BLOB_AREA)
	);
</script>

<svg
	class="chord"
	viewBox={CHORD_VIEWBOX}
	style:--chord-size="{CHORD_SIZE}px"
	role="img"
	aria-label={chord.roman}
>
	<defs>
		<filter id={splotchId} {...FILTER_REGION}>
			{#if settings.noise > 0}
				<feTurbulence
					type="fractalNoise"
					baseFrequency={settings.noise}
					numOctaves={NOISE_OCTAVES}
					seed={chord.seed}
				/>
				<feColorMatrix values={NOISE_ALPHA_MATRIX} result="texture" />
				<feComposite in="SourceGraphic" in2="texture" operator="in" />
			{/if}
			<feGaussianBlur stdDeviation={settings.blur} />
		</filter>
		<filter id={thresholdId} {...FILTER_REGION}>
			<feGaussianBlur
				in="SourceGraphic"
				stdDeviation={thresholdBlur}
				result="blur"
			/>
			<feColorMatrix
				in="blur"
				type="matrix"
				values={ALPHA_THRESHOLD_MATRIX}
				result="threshold"
			/>
			<feComposite in="SourceGraphic" in2="threshold" operator="atop" />
		</filter>
		<filter id={pencilId} {...FILTER_REGION}>
			<feTurbulence
				type="fractalNoise"
				baseFrequency={PENCIL_FILTER.baseFrequency}
				numOctaves={PENCIL_FILTER.octaves}
				seed={chord.seed}
			/>
			<feDisplacementMap
				in="SourceGraphic"
				scale={PENCIL_FILTER.displacement}
				xChannelSelector="R"
				yChannelSelector="G"
			/>
			<feGaussianBlur stdDeviation={PENCIL_FILTER.blur} />
		</filter>
	</defs>
	<g filter="url(#{splotchId})">
		<path
			d={shapePath}
			fill={colors.fill}
			filter="url(#{thresholdId})"
		/>
	</g>
	<path class="pencil" d={shapePath} filter="url(#{pencilId})" />
	<text class="label" fill={colors.text}>{chord.roman}</text>
</svg>

<style>
	.chord {
		width: var(--chord-size);
		height: var(--chord-size);
		flex: none;
		overflow: visible;
	}

	.pencil {
		fill: none;
		stroke: #a1a1aa;
		stroke-width: 2px;
		stroke-linejoin: round;
		opacity: 0;
		transition: opacity 150ms ease;
	}

	.chord:hover .pencil {
		opacity: 0.8;
	}

	.label {
		font-size: 1.125rem;
		font-weight: 600;
		text-anchor: middle;
		dominant-baseline: central;
		pointer-events: none;
	}
</style>
