<svelte:options namespace="svg" />

<script lang="ts">
	import {
		fillFor,
		labelColorFor,
		type FloatingIds,
		type GooeyChord,
		type FloatingSettings
	} from "./floatingEffects.js";

	type Props = {
		chords: GooeyChord[];
		settings: FloatingSettings;
		ids: FloatingIds;
	};

	let { chords, settings, ids }: Props = $props();
</script>

<g class="circles" filter="url(#{ids.gooey})">
	{#each chords as chord (chord.id)}
		<circle
			cx={chord.x}
			cy={chord.y}
			r={chord.radius}
			fill={fillFor(ids.gradientPrefix, settings.gradient, chord.tone)}
			style:mix-blend-mode={settings.blend}
		/>
	{/each}
</g>
{#each chords as chord (chord.id)}
	<text
		class="label"
		x={chord.x}
		y={chord.y}
		fill={labelColorFor(settings.gradient, chord.tone)}>{chord.roman}</text
	>
{/each}

<style>
	.circles {
		isolation: isolate;
	}

	.label {
		font-size: var(--chord-label-size, 0.875rem);
		font-weight: 600;
		text-anchor: middle;
		dominant-baseline: central;
		pointer-events: none;
	}
</style>
