<script lang="ts">
	import { interpolateRgb } from "d3";
	import ChordLane from "./ChordLane.svelte";
	import WatercolorFilters from "./chord-viz/WatercolorFilters.svelte";
	import {
		DEFAULT_WATERCOLOR_SETTINGS,
		FILTER_REGION,
		watercolorFilterIdsFor
	} from "./chord-viz/watercolor.js";
	import {
		bySection,
		chordGlideAt,
		gliderFor,
		layoutLaneBlobs,
		type LaneBlob,
		type LaneChord,
		type LaneSpacing
	} from "./chordLanes.js";

	const LANE_HEIGHT_PX = 64;
	const LANE_PADDING_PX = 8;
	const LANE_CENTER_Y = LANE_HEIGHT_PX / 2;
	const GOOEY_BLUR = 4;
	const GOOEY_ALPHA_MATRIX = "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8";
	const WATERCOLOR_SEED = 0;
	const RESTING_FADE_COLOR = "#ffffff";
	const RESTING_FADE = 0.55;
	const SPACING: LaneSpacing = {
		clusterKeyOf: bySection,
		overlapFraction: 0.12,
		clusterGapPx: 18
	};

	type Props = {
		chords: LaneChord[];
		progressFraction: number;
		onSeek: (fraction: number) => void;
	};

	let { chords, progressFraction, onSeek }: Props = $props();

	const uid = $props.id();
	const gooeyId = `lane-gooey-${uid}`;
	const watercolorIds = watercolorFilterIdsFor(`lane-gooey-${uid}`);

	let widthPx = $state(0);

	const blobs = $derived(
		layoutLaneBlobs(
			chords,
			{ widthPx, heightPx: LANE_HEIGHT_PX, paddingPx: LANE_PADDING_PX },
			SPACING
		)
	);
	const glide = $derived(chordGlideAt(chords, progressFraction));
	const glider = $derived(glide && gliderFor(chords, blobs, glide));

	const restingFill = (chord: LaneChord): string =>
		interpolateRgb(
			chord.appearance.colors.fill,
			RESTING_FADE_COLOR
		)(RESTING_FADE);

	const blobTransform = (blob: LaneBlob): string =>
		`translate(${blob.centerX} ${LANE_CENTER_Y}) scale(${blob.scaleX} ${blob.scaleY})`;
</script>

<ChordLane
	label="gooey active chord"
	heightPx={LANE_HEIGHT_PX}
	bind:widthPx
	{onSeek}
>
	<svg aria-hidden="true">
		<defs>
			<filter id={gooeyId} {...FILTER_REGION}>
				<feGaussianBlur
					in="SourceGraphic"
					stdDeviation={GOOEY_BLUR}
					result="blur"
				/>
				<feColorMatrix in="blur" mode="matrix" values={GOOEY_ALPHA_MATRIX} />
			</filter>
			<WatercolorFilters
				ids={watercolorIds}
				seed={WATERCOLOR_SEED}
				settings={DEFAULT_WATERCOLOR_SETTINGS}
			/>
		</defs>
		<g filter="url(#{watercolorIds.splotch})">
			<g filter="url(#{gooeyId})">
				{#each chords as chord, index (chord.key)}
					<path
						d={chord.appearance.path}
						fill={restingFill(chord)}
						transform={blobTransform(blobs[index])}
					/>
				{/each}
				{#if glider}
					<path
						d={glider.path}
						fill={glider.fill}
						transform={blobTransform(glider)}
					/>
				{/if}
			</g>
		</g>
		{#each chords as chord, index (chord.key)}
			<text
				class="label"
				class:active={index === glider?.labelIndex}
				x={blobs[index].centerX}
				y={LANE_CENTER_Y}
				fill={chord.appearance.colors.text}>{chord.roman}</text
			>
		{/each}
	</svg>
</ChordLane>

<style>
	.label {
		font-size: 0.625rem;
		font-weight: 500;
		text-anchor: middle;
		dominant-baseline: central;
		pointer-events: none;
		opacity: 0.75;
	}

	.label.active {
		font-weight: 700;
		opacity: 1;
	}
</style>
