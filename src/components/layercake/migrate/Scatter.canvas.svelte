<script lang="ts">
	import type { LayerCakeContext, CanvasContext } from "$types/layercake";
	import { getContext } from "svelte";
	import { scaleCanvas } from "layercake";

	const { data, xGet, yGet, width, height } = getContext<LayerCakeContext>("LayerCake");
	let { r = 4, fill = "#ccc", stroke = "#000", strokeWidth = 0 } = $props();

	const { ctx } = getContext<CanvasContext>("canvas");

	$effect(() => {
		if (!ctx) return;
		scaleCanvas(ctx, $width, $height);
		ctx.clearRect(0, 0, $width, $height);

		$data.forEach((d: Record<string, unknown>) => {
			ctx.beginPath();
			ctx.arc($xGet(d), $yGet(d), r, 0, 2 * Math.PI, false);
			ctx.lineWidth = strokeWidth;
			ctx.strokeStyle = stroke;
			ctx.stroke();
			ctx.fillStyle = fill;
			ctx.fill();
		});
	});
</script>
