<script lang="ts">
	import type { VizChord } from "./diatonicChords.js";
	import {
		CHORD_SIZE,
		CHORD_VIEWBOX,
		watercolorFilterIdsFor,
		type WatercolorSettings
	} from "./watercolor.js";
	import { appearanceFor } from "./chordAppearanceLookup.js";
	import type { ChordPalette } from "./chordPalettes.js";
	import WatercolorFilters from "./WatercolorFilters.svelte";

	type Props = {
		chord: VizChord;
		settings: WatercolorSettings;
		palette: ChordPalette;
	};

	let { chord, settings, palette }: Props = $props();

	const uid = $props.id();
	const ids = watercolorFilterIdsFor(uid);

	const appearance = $derived(
		appearanceFor(chord.tonality, chord.roman, palette)
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
		<WatercolorFilters {ids} seed={chord.seed} {settings} />
	</defs>
	<g filter="url(#{ids.splotch})">
		<path
			d={appearance.path}
			fill={appearance.colors.fill}
			filter="url(#{ids.threshold})"
		/>
	</g>
	<path class="pencil" d={appearance.path} filter="url(#{ids.pencil})" />
	<text class="label" fill={appearance.colors.text}>{chord.roman}</text>
</svg>

<style>
	.chord {
		width: var(--chord-size);
		height: var(--chord-size);
		flex: none;
		overflow: visible;
		mix-blend-mode: multiply;
	}

	.pencil {
		fill: none;
		stroke: #18181b;
		stroke-width: 1.25px;
		stroke-linejoin: round;
		opacity: 0;
		transition: opacity 150ms ease;
	}

	.chord:hover .pencil {
		opacity: 1;
	}

	.label {
		font-size: 1.125rem;
		font-weight: 600;
		text-anchor: middle;
		dominant-baseline: central;
		pointer-events: none;
	}
</style>
