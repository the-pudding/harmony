<script lang="ts">
	import FloatingGradients from "./FloatingGradients.svelte";
	import { GOOEY_ALPHA_MATRIX, GOOEY_BLUR } from "./floatingChords.js";
	import type { FloatingIds } from "./floatingEffects.js";

	type Props = {
		ids: FloatingIds;
	};

	let { ids }: Props = $props();
</script>

<svg class="defs" aria-hidden="true">
	<defs>
		<filter id={ids.gooey}>
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
		<FloatingGradients prefix={ids.gradientPrefix} />
	</defs>
</svg>

<style>
	.defs {
		position: absolute;
		width: 0;
		height: 0;
		overflow: hidden;
	}
</style>
