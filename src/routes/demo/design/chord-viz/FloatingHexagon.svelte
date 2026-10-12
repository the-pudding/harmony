<script lang="ts">
	import { untrack } from "svelte";
	import GooeyChords from "./GooeyChords.svelte";
	import {
		FLOATING_CHORDS,
		FLOATING_VIEWBOX,
		HEXAGON_PATH
	} from "./floatingChords.js";
	import type { FloatingIds, FloatingSettings } from "./floatingEffects.js";
	import { createFloaters, startDrifting } from "./floatingMotion.js";

	type Props = {
		settings: FloatingSettings;
		ids: FloatingIds;
	};

	let { settings, ids }: Props = $props();

	const uid = $props.id();
	const clipId = `hexagon-clip-${uid}`;

	const floaters = createFloaters(FLOATING_CHORDS);

	const gooeyChords = $derived(
		floaters.map(({ chord, position }) => ({
			id: chord.id,
			roman: chord.roman,
			tone: chord.tone,
			radius: chord.radius,
			...position.current
		}))
	);

	$effect(() => {
		if (!settings.animate) return;
		return untrack(() => startDrifting(floaters));
	});
</script>

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
	</defs>
	<g clip-path="url(#{clipId})">
		<GooeyChords chords={gooeyChords} {settings} {ids} />
	</g>
	<path class="hexagon" d={HEXAGON_PATH} />
</svg>

<style>
	.stage {
		width: 100%;
		max-width: 25rem;
		height: auto;
	}

	.hexagon {
		fill: none;
		stroke: #f2f2f2;
		stroke-width: 4px;
	}
</style>
