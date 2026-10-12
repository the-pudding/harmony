<svelte:options namespace="svg" />

<script lang="ts">
	import { HEX_HALF_WIDTH } from "./floatingChords.js";
	import {
		ABRUPT_STOPS,
		ANIMATED_GRADIENT,
		ANIMATED_STOPS,
		CHORD_TONES,
		RADIAL_GEOMETRY,
		RAINBOW_STOPS,
		gradientIdFor,
		radialGradientIdFor,
		radialStopsFor,
		type GradientStop
	} from "./floatingEffects.js";
	import { CHORD_TONE_COLORS } from "./watercolor.js";

	type Props = {
		prefix: string;
	};

	let { prefix }: Props = $props();

	const HORIZONTAL_SPAN = {
		x1: -HEX_HALF_WIDTH,
		x2: HEX_HALF_WIDTH,
		y1: 0,
		y2: 0
	};
</script>

{#snippet stops(gradientStops: GradientStop[])}
	{#each gradientStops as stop, index (index)}
		<stop offset={stop.offset} stop-color={stop.color} />
	{/each}
{/snippet}

<linearGradient
	id={gradientIdFor(prefix, "rainbow")}
	gradientUnits="userSpaceOnUse"
	{...HORIZONTAL_SPAN}
>
	{@render stops(RAINBOW_STOPS)}
</linearGradient>

<linearGradient
	id={gradientIdFor(prefix, "abrupt")}
	gradientUnits="userSpaceOnUse"
	{...HORIZONTAL_SPAN}
>
	{@render stops(ABRUPT_STOPS)}
</linearGradient>

<linearGradient
	id={gradientIdFor(prefix, "animated")}
	spreadMethod="reflect"
	x1="0"
	y1="0"
	x2="1"
	y2="0"
>
	{@render stops(ANIMATED_STOPS)}
	<animate
		attributeName="x1"
		values={ANIMATED_GRADIENT.x1Values}
		dur={ANIMATED_GRADIENT.duration}
		repeatCount="indefinite"
	/>
	<animate
		attributeName="x2"
		values={ANIMATED_GRADIENT.x2Values}
		dur={ANIMATED_GRADIENT.duration}
		repeatCount="indefinite"
	/>
</linearGradient>

{#each CHORD_TONES as tone (tone)}
	<radialGradient id={radialGradientIdFor(prefix, tone)} {...RADIAL_GEOMETRY}>
		{@render stops(radialStopsFor(CHORD_TONE_COLORS[tone].fill))}
	</radialGradient>
{/each}
