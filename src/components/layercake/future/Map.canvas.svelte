<!--
	@component
	Generates a canvas map using the `geoPath` function from [d3-geo](https://github.com/d3/d3-geo).
 -->
<script lang="ts">
	import type { LayerCakeContext, CanvasContext } from "$types/layercake";
	import { getContext } from "svelte";
	import { scaleCanvas } from "layercake";
	import { geoPath, type GeoPath } from "d3-geo";
	import type { GeoJSON } from "geojson";
	import type { GeoProjection } from "d3-geo";

	const { data, width, height, zGet } = getContext<LayerCakeContext>("LayerCake");
	let {
		projection,
		stroke = "#ccc",
		strokeWidth = 1,
		fill = undefined,
		features = undefined
	}: {
		projection: () => GeoProjection;
		stroke?: string;
		strokeWidth?: number;
		fill?: string;
		features?: GeoJSON.Feature[];
	} = $props();

	const { ctx } = getContext<CanvasContext>("canvas");

	const geoData = $derived($data as unknown as GeoJSON.FeatureCollection);
	const projectionFn = $derived(projection().fitSize([$width ?? 0, $height ?? 0], geoData));
	const geoPathFn = $derived(geoPath(projectionFn) as GeoPath);
	const featuresToDraw = $derived(features ?? geoData.features);

	$effect(() => {
		if (!ctx) return;
		scaleCanvas(ctx, $width, $height);
		ctx.clearRect(0, 0, $width, $height);

		featuresToDraw.forEach((feature) => {
			ctx.beginPath();
			geoPathFn.context(ctx);
			geoPathFn(feature);
			ctx.fillStyle = fill || String($zGet(feature.properties));
			ctx.fill();
			ctx.lineWidth = strokeWidth;
			ctx.strokeStyle = stroke;
			ctx.stroke();
		});
	});
</script>
