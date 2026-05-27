<!--
	@component
	Generates canvas dots onto a map using [d3-geo](https://github.com/d3/d3-geo).
 -->
<script lang="ts">
	import type { LayerCakeContext } from "$types/layercake";
	import type { FeatureCollection } from "geojson";
	/** @type {Function} projection - A D3 projection function. Pass this in as an uncalled function, e.g. `projection={geoAlbersUsa}`. */
	import { getContext } from 'svelte';

	const { data, width, height } = getContext<LayerCakeContext>("LayerCake");
	let { projection, r = 3.5, fill = 'yellow', stroke = '#000', strokeWidth = 1, opacity = 1, features = undefined } = $props();

	const geoData = $derived($data as unknown as FeatureCollection);


	/* --------------------------------------------
	 * Require a D3 projection function
	 */

	/** @type {Number} [r=3.5] - The point's radius. */

	/** @type {String} [fill='yellow'] - The point's fill color. */

	/** @type {String} [stroke='#000'] - The point's stroke color. */

	/** @type {Number} [strokeWidth=1] - The point's stroke width. */

	/** @type {Number} [opacity=1] - The point's opacity. */

	/** @type {Array} [features] - A list of GeoJSON features to plot. If unset, the plotted features will defaults to those in `$data.features`, assuming this field a list of GeoJSON features. */

	const projectionFn = $derived(projection().fitSize([$width ?? 0, $height ?? 0], $data));
</script>

<g class="points">
{#each (features || geoData.features) as d}
	<!-- To scale the circle by size, set r to `$rGet(d.properties)` -->
	<circle
		cx={projectionFn(d.geometry.coordinates)[0]}
		cy={projectionFn(d.geometry.coordinates)[1]}
		r="{r}"
		fill="{fill}"
		stroke="{stroke}"
		stroke-width="{strokeWidth}"
		opacity="{opacity}"
	/>
{/each}
</g>
