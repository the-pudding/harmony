<!--
	@component
	Generates canvas dots onto a map using [d3-geo](https://github.com/d3/d3-geo).
 -->
<script lang="ts">
	import type { LayerCakeContext } from "$types/layercake";
	import type { FeatureCollection } from "geojson";
	import { getContext } from 'svelte';

	const { data, width, height } = getContext<LayerCakeContext>("LayerCake");
	let { projection, r = 3.5, fill = 'yellow', stroke = '#000', strokeWidth = 1, opacity = 1, features = undefined } = $props();

	const geoData = $derived($data as unknown as FeatureCollection);


	/** @type {Function} projection - A D3 projection function. Pass this in as an uncalled function, e.g. `projection={geoAlbersUsa}`. */

	/** @type {Number} [r=3.5] - The point's radius. */

	/** @type {String} [fill='yellow'] - The point's fill color. */

	/** @type {String} [stroke='#000'] - The point's stroke color. */

	/** @type {Number} [strokeWidth=1] - The point's stroke width, in pixels. */

	/** @type {Number} [opacity=1] - The point's opacity. */

	/** @type {Array} [features] - A list of GeoJSON features to plot. If unset, the plotted features will defaults to those in `$data.features`, assuming this field a list of GeoJSON features. */

	const projectionFn = $derived(projection().fitSize([$width ?? 0, $height ?? 0], $data));
</script>

<div class="points">
<!-- To scale the circle by size, set width and height to `$rGet(d.properties)` -->
{#each (features || geoData.features) as d}
	<div
		class="point"
		style="
			top: {projectionFn(d.geometry.coordinates)[1]}px;
			left: {projectionFn(d.geometry.coordinates)[0]}px;
			width: {r * 2}px;
			height: {r * 2}px;
			border-width: {strokeWidth}px;
			border-color: {stroke};
			background-color: {fill};
			opacity: {opacity};
		"
	>
	</div>
{/each}
</div>

<style>
	.point {
		position: absolute;
		border-radius: 50%;
		border-style: solid;
	}
</style>
