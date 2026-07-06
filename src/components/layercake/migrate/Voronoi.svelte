<script lang="ts">
	import type { LayerCakeContext } from "$types/layercake";
	import { getContext, createEventDispatcher } from "svelte";
	import { uniques } from "layercake";
	import { Delaunay } from "d3";

	const { data, xGet, yGet, width, height } =
		getContext<LayerCakeContext>("LayerCake");
	let { stroke = undefined }: { stroke?: string } = $props();

	const dispatcher = createEventDispatcher();

	type VoronoiPoint = [number, number] & { data?: unknown };

	const onEnter = (point: VoronoiPoint) =>
		dispatcher("voronoi-mouseover", point);

	const points = $derived(
		$data.map((d: Record<string, unknown>) => {
			const point = [$xGet(d), $yGet(d)] as VoronoiPoint;
			point.data = d;
			return point;
		})
	);
	const uniquePoints = $derived(
		uniques(points, (d: VoronoiPoint) => d.join(), false)
	);
	const voronoi = $derived(
		Delaunay.from(uniquePoints).voronoi([0, 0, $width ?? 0, $height ?? 0])
	);
</script>

{#each uniquePoints as point, i}
	<path
		style:stroke
		d={voronoi.renderCell(i)}
		on:mouseover={() => onEnter(point)}
		on:focus={() => onEnter(point)}
	/>
{/each}

<style>
	path {
		fill: none;
		stroke: none;
		pointer-events: all;
		outline: none;
	}
</style>
