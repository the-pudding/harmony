<script lang="ts">
	import ChordLane from "./ChordLane.svelte";
	import WatercolorFilters from "./chord-viz/WatercolorFilters.svelte";
	import {
		DEFAULT_WATERCOLOR_SETTINGS,
		watercolorFilterIdsFor
	} from "./chord-viz/watercolor.js";
	import {
		activeChordIndexAt,
		byProgression,
		layoutLaneBlobs,
		type LaneChord,
		type LaneSpacing
	} from "./chordLanes.js";

	const LANE_HEIGHT_PX = 64;
	const LANE_PADDING_PX = 6;
	const SEED_VARIANT_COUNT = 4;
	const SPACING: LaneSpacing = {
		clusterKeyOf: byProgression,
		overlapFraction: 0.35,
		clusterGapPx: 12
	};

	type Props = {
		chords: LaneChord[];
		progressFraction: number;
		onSeek: (fraction: number) => void;
	};

	let { chords, progressFraction, onSeek }: Props = $props();

	const uid = $props.id();
	const seedFilterIds = Array.from({ length: SEED_VARIANT_COUNT }, (_, seed) =>
		watercolorFilterIdsFor(`${uid}-${seed}`)
	);
	const filterIdsFor = (index: number) =>
		seedFilterIds[index % SEED_VARIANT_COUNT];

	let widthPx = $state(0);

	const blobs = $derived(
		layoutLaneBlobs(
			chords,
			{ widthPx, heightPx: LANE_HEIGHT_PX, paddingPx: LANE_PADDING_PX },
			SPACING
		)
	);
	const activeIndex = $derived(activeChordIndexAt(chords, progressFraction));
</script>

<ChordLane
	label="watercolor progressions"
	heightPx={LANE_HEIGHT_PX}
	bind:widthPx
	{onSeek}
>
	<svg aria-hidden="true">
		<defs>
			{#each seedFilterIds as ids, seed (ids.splotch)}
				<WatercolorFilters
					{ids}
					{seed}
					settings={DEFAULT_WATERCOLOR_SETTINGS}
				/>
			{/each}
		</defs>
		{#each chords as chord, index (chord.key)}
			{@const ids = filterIdsFor(index)}
			{@const blob = blobs[index]}
			<g
				class="chord"
				class:active={index === activeIndex}
				transform="translate({blob.centerX} {LANE_HEIGHT_PX / 2})"
			>
				<g transform="scale({blob.scaleX} {blob.scaleY})">
					<g filter="url(#{ids.splotch})">
						<path
							d={chord.appearance.path}
							fill={chord.appearance.colors.fill}
							filter="url(#{ids.threshold})"
						/>
					</g>
					<path
						class="pencil"
						d={chord.appearance.path}
						filter="url(#{ids.pencil})"
						vector-effect="non-scaling-stroke"
					/>
				</g>
				<text class="label" fill={chord.appearance.colors.text}
					>{chord.roman}</text
				>
			</g>
		{/each}
	</svg>
</ChordLane>

<style>
	.chord {
		opacity: 0.45;
		mix-blend-mode: multiply;
		transition: opacity 150ms ease;
	}

	.chord.active {
		opacity: 1;
	}

	.pencil {
		fill: none;
		stroke: #18181b;
		stroke-width: 1.25px;
		stroke-linejoin: round;
		opacity: 0;
		transition: opacity 150ms ease;
	}

	.chord.active .pencil {
		opacity: 1;
	}

	.label {
		font-size: 0.625rem;
		font-weight: 600;
		text-anchor: middle;
		dominant-baseline: central;
		pointer-events: none;
	}

	.chord.active .label {
		font-weight: 700;
	}
</style>
