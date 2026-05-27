<!--
	@component
	Generates canvas dots onto a map using [d3-geo](https://github.com/d3/d3-geo).
 -->
<script lang="ts">
	import type { LayerCakeContext, CanvasContext } from "$types/layercake";
	import { getContext } from "svelte";
	import { scaleCanvas } from "layercake";
	import type { GeoJSON } from "geojson";
	import type { GeoProjection } from "d3-geo";

	const { data, width, height } = getContext<LayerCakeContext>("LayerCake");
	let {
		projection,
		r = 3.5,
		fill = "yellow",
		stroke = "#000",
		strokeWidth = 1,
		features = undefined
	}: {
		projection: () => GeoProjection;
		r?: number;
		fill?: string;
		stroke?: string;
		strokeWidth?: number;
		features?: GeoJSON.Feature[];
	} = $props();

	const { ctx } = getContext<CanvasContext>("canvas");

	const geoData = $derived($data as unknown as GeoJSON.FeatureCollection);
	const projectionFn = $derived(projection().fitSize([$width ?? 0, $height ?? 0], geoData));
	const featuresToDraw = $derived(features ?? geoData.features);

	$effect(() => {
		if (!ctx) return;
		scaleCanvas(ctx, $width, $height);
		ctx.clearRect(0, 0, $width, $height);

		featuresToDraw.forEach((d) => {
			ctx.beginPath();
			const geom = d.geometry;
			if (geom.type !== "Point") return;
			const coordinates = projectionFn(geom.coordinates as [number, number]);
			if (!coordinates) return;
			ctx.arc(coordinates[0], coordinates[1], r, 0, 2 * Math.PI, false);
			ctx.fillStyle = fill;
			ctx.fill();
			ctx.lineWidth = strokeWidth;
			ctx.strokeStyle = stroke;
			ctx.stroke();
		});
	});
</script>
