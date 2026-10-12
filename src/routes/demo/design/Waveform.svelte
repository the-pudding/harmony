<script lang="ts">
	import {
		WAVEFORM_VIEWBOX_HEIGHT,
		waveformAreaPath
	} from "./waveformPeaks.js";

	type Props = {
		peaks: number[];
	};

	let { peaks }: Props = $props();

	const path = $derived(waveformAreaPath(peaks));
</script>

<svg
	class="waveform"
	viewBox="0 0 {peaks.length} {WAVEFORM_VIEWBOX_HEIGHT}"
	preserveAspectRatio="none"
	aria-hidden="true"
>
	<path d={path} />
</svg>

<style>
	.waveform {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	path {
		fill: rgba(161, 161, 170, 0.55);
	}
</style>
