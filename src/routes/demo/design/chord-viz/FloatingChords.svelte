<script lang="ts">
	import { untrack } from "svelte";
	import ChordVizPanel from "./ChordVizPanel.svelte";
	import FloatingControls from "./FloatingControls.svelte";
	import FloatingGradients from "./FloatingGradients.svelte";
	import {
		FLOATING_CHORDS,
		FLOATING_VIEWBOX,
		GOOEY_ALPHA_MATRIX,
		GOOEY_BLUR,
		HEXAGON_PATH
	} from "./floatingChords.js";
	import {
		DEFAULT_FLOATING_SETTINGS,
		fillFor,
		labelColorFor,
		type FloatingSettings
	} from "./floatingEffects.js";
	import { createFloaters, startDrifting } from "./floatingMotion.js";

	const HEXAGONS_NOTEBOOK_URL = "https://observablehq.com/d/821fca17be68685d";

	const uid = $props.id();
	const clipId = `hexagon-clip-${uid}`;
	const gooeyId = `gooey-${uid}`;
	const gradientPrefix = `gradient-${uid}`;

	const floaters = createFloaters(FLOATING_CHORDS);

	let settings = $state<FloatingSettings>(DEFAULT_FLOATING_SETTINGS);

	$effect(() => {
		if (!settings.animate) return;
		return untrack(() => startDrifting(floaters));
	});
</script>

<ChordVizPanel
	title="Floating chords"
	creditLabel="Nadieh Bremer's SVG gradient & filter playground"
	creditUrl={HEXAGONS_NOTEBOOK_URL}
>
	<div class="layout">
		<FloatingControls {settings} onChange={(next) => (settings = next)} />
		<svg
			class="stage"
			viewBox={FLOATING_VIEWBOX}
			role="img"
			aria-label="Floating chords"
		>
			<defs>
				<clipPath id={clipId}>
					<path d={HEXAGON_PATH} />
				</clipPath>
				<filter id={gooeyId}>
					<feGaussianBlur
						in="SourceGraphic"
						stdDeviation={GOOEY_BLUR}
						result="blur"
					/>
					<feColorMatrix
						in="blur"
						mode="matrix"
						values={GOOEY_ALPHA_MATRIX}
						result="gooey"
					/>
				</filter>
				<FloatingGradients prefix={gradientPrefix} />
			</defs>
			<g clip-path="url(#{clipId})">
				<g class="circles" filter="url(#{gooeyId})">
					{#each floaters as { chord, position } (chord.id)}
						<circle
							cx={position.current.x}
							cy={position.current.y}
							r={chord.radius}
							fill={fillFor(gradientPrefix, settings.gradient, chord.tone)}
							style:mix-blend-mode={settings.blend}
						/>
					{/each}
				</g>
				{#each floaters as { chord, position } (chord.id)}
					<text
						class="label"
						x={position.current.x}
						y={position.current.y}
						fill={labelColorFor(settings.gradient, chord.tone)}
						>{chord.roman}</text
					>
				{/each}
			</g>
			<path class="hexagon" d={HEXAGON_PATH} />
		</svg>
	</div>
</ChordVizPanel>

<style>
	.layout {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 1.5rem 3rem;
	}

	.stage {
		width: 100%;
		max-width: 25rem;
		height: auto;
	}

	.circles {
		isolation: isolate;
	}

	.label {
		font-size: 0.875rem;
		font-weight: 600;
		text-anchor: middle;
		dominant-baseline: central;
		pointer-events: none;
	}

	.hexagon {
		fill: none;
		stroke: #f2f2f2;
		stroke-width: 4px;
	}
</style>
