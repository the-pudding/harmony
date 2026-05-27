<!--
	@component
	Adds SVG text labels based features in the data or a custom GeoJSON Feature Collection.
 -->
<script lang="ts">
	import type { LayerCakeContext } from "$types/layercake";
	import type { FeatureCollection } from "geojson";
	import { getContext } from 'svelte';

	const { data, width, height } = getContext<LayerCakeContext>("LayerCake");
	let { projection, getLabel, fixedAspectRatio = undefined, getCoordinates, features = undefined } = $props();

	const geoData = $derived($data as unknown as FeatureCollection);


	/** @type {Function} projection - A D3 projection function. Pass this in as an uncalled function, e.g. `projection={geoAlbersUsa}`. */

	/** @type {Function} getLabel - An accessor function to get the field to display. */

	/** @type {Number} [fixedAspectRatio] - By default, the map fills to fit the $width and $height. If instead you want a fixed-aspect ratio, like for a server-side rendered map, set that here. */

	/** @type {Function} [getCoordinates=d => d.geometry.coordinates] - An accessor function to get the `[x, y]` coordinate field. Defaults to a GeoJSON feature format. */

	/** @type {Array} [features] - A list of labels as GeoJSON features. If unset, the plotted features will defaults to those in `$data.features`, assuming this field a list of GeoJSON features. */

	const fitSizeRange = $derived(fixedAspectRatio ? [100, 100 / fixedAspectRatio] : [$width, $height]);

	const projectionFn = $derived(projection().fitSize(fitSizeRange, $data));
</script>

<g class="map-labels">
{#each (features || geoData.features) as d}
	{@const coords = projectionFn(getCoordinates(d))}
	<text
		class="map-label"
		x="{coords[0]}"
		y="{coords[1]}"
	>{getLabel(d)}</text>
{/each}
</g>

<style>
	.map-labels {
		pointer-events: none;
	}
	.map-label {
		color: #333;
		/**
		 * If you render this in an ScaledSvg layout component, you'll
		 * want to make this like 1px bc it's actually being zoomed by about 10x
		 */
		font-size: 8px;
		text-anchor: middle;
	}
</style>
