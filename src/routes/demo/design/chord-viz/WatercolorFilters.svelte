<svelte:options namespace="svg" />

<script lang="ts">
	import {
		ALPHA_THRESHOLD_MATRIX,
		BLOB_AREA,
		FILTER_REGION,
		NOISE_ALPHA_MATRIX,
		NOISE_OCTAVES,
		PENCIL_FILTER,
		thresholdBlurFor,
		type WatercolorFilterIds,
		type WatercolorSettings
	} from "./watercolor.js";

	type Props = {
		ids: WatercolorFilterIds;
		seed: number;
		settings: WatercolorSettings;
	};

	let { ids, seed, settings }: Props = $props();

	const thresholdBlur = $derived(
		thresholdBlurFor(settings.deviation, BLOB_AREA)
	);
</script>

<filter id={ids.splotch} {...FILTER_REGION}>
	{#if settings.noise > 0}
		<feTurbulence
			type="fractalNoise"
			baseFrequency={settings.noise}
			numOctaves={NOISE_OCTAVES}
			{seed}
		/>
		<feColorMatrix values={NOISE_ALPHA_MATRIX} result="texture" />
		<feComposite in="SourceGraphic" in2="texture" operator="in" />
	{/if}
	<feGaussianBlur stdDeviation={settings.blur} />
</filter>
<filter id={ids.threshold} {...FILTER_REGION}>
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
<filter id={ids.pencil} {...FILTER_REGION}>
	<feTurbulence
		type="fractalNoise"
		baseFrequency={PENCIL_FILTER.baseFrequency}
		numOctaves={PENCIL_FILTER.octaves}
		{seed}
	/>
	<feDisplacementMap
		in="SourceGraphic"
		scale={PENCIL_FILTER.displacement}
		xChannelSelector="R"
		yChannelSelector="G"
	/>
	<feGaussianBlur stdDeviation={PENCIL_FILTER.blur} />
</filter>
