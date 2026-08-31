<script lang="ts">
	import {
		applyHighlightMarkerStyles,
		highlightRingDiameterPx
	} from "./highlightSongMarker.js";

	type Props = {
		title: string;
		x: number;
		y: number;
		pointRadiusPx: number;
	};

	const { title, x, y, pointRadiusPx }: Props = $props();

	const ringDiameterPx = $derived(highlightRingDiameterPx(pointRadiusPx));

	const applyMarkerStyles = (element: HTMLElement) => {
		applyHighlightMarkerStyles(element);
	};
</script>

<div
	class="harmony-highlight-marker"
	style:left="{x}px"
	style:top="{y}px"
	style:--ring-size="{ringDiameterPx}px"
	use:applyMarkerStyles
>
	<span class="harmony-highlight-title" title={title}>{title}</span>
	<div class="harmony-highlight-ring" aria-hidden="true"></div>
</div>
