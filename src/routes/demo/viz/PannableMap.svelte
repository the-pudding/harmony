<script lang="ts">
	import { select, zoom, zoomIdentity, type ZoomTransform } from "d3";
	import type { EmbeddingPoint } from "./embeddingWorldPoints.js";
	import type { NamedClusterOutline } from "./mapClusters.js";

	type Props = {
		points: EmbeddingPoint[];
		width: number;
		height: number;
		worldSize: number;
		radius: number;
		color: string;
		outlines: NamedClusterOutline[];
		showLabels: boolean;
		title: string;
	};

	const { points, width, height, worldSize, radius, color, outlines, showLabels, title }: Props =
		$props();

	const MIN_ZOOM = 0.3;
	const MAX_ZOOM = 12;
	const WORLD_PADDING = 200;
	const LABEL_GAP = 6;

	let svgEl: SVGSVGElement | undefined = $state();
	let transform = $state<ZoomTransform>(zoomIdentity);
	let hasCentered = false;

	let zoomBehavior: ReturnType<typeof zoom<SVGSVGElement, unknown>> | null = null;

	$effect(() => {
		const svg = svgEl;
		if (!svg) return;
		zoomBehavior = zoom<SVGSVGElement, unknown>()
			.scaleExtent([MIN_ZOOM, MAX_ZOOM])
			.translateExtent([
				[-WORLD_PADDING, -WORLD_PADDING],
				[worldSize + WORLD_PADDING, worldSize + WORLD_PADDING]
			])
			.on("zoom", (event) => {
				transform = event.transform;
			});
		select(svg).call(zoomBehavior);
		return () => {
			select(svg).on(".zoom", null);
			zoomBehavior = null;
		};
	});

	// Center the viewport on the world once points first arrive.
	$effect(() => {
		if (hasCentered || points.length === 0 || !svgEl || !zoomBehavior) return;
		const initial = zoomIdentity.translate(width / 2 - worldSize / 2, height / 2 - worldSize / 2);
		select(svgEl).call(zoomBehavior.transform, initial);
		hasCentered = true;
	});

	const toDegrees = (radians: number): number => (radians * 180) / Math.PI;
</script>

<svg
	bind:this={svgEl}
	{width}
	{height}
	style="width: {width}px; height: {height}px;"
	role="img"
	aria-label={title}
	class="map"
>
	<g transform={transform.toString()}>
		{#if showLabels}
			{#each outlines as outline (outline.name)}
				<ellipse
					cx={outline.ellipse.centroid.x}
					cy={outline.ellipse.centroid.y}
					rx={outline.ellipse.semiAxisX}
					ry={outline.ellipse.semiAxisY}
					transform="rotate({toDegrees(outline.ellipse.rotationRadians)} {outline.ellipse
						.centroid.x} {outline.ellipse.centroid.y})"
					class="cluster-outline"
				/>
			{/each}
		{/if}
		{#each points as point (point.songKey)}
			<circle cx={point.x} cy={point.y} r={radius} fill={color} />
		{/each}
		{#if showLabels}
			{#each outlines as outline (outline.name)}
				<text
					x={outline.ellipse.centroid.x}
					y={outline.ellipse.centroid.y - outline.ellipse.semiAxisY - LABEL_GAP}
					text-anchor="middle"
					class="cluster-label">{outline.name}</text
				>
			{/each}
		{/if}
	</g>
</svg>

<style>
	.map {
		display: block;
		flex-shrink: 0;
		touch-action: none;
		cursor: grab;
	}

	.map:active {
		cursor: grabbing;
	}

	.cluster-outline {
		stroke: #3f3f46;
		stroke-width: 1.5;
		stroke-dasharray: 3 3;
		fill: none;
		vector-effect: non-scaling-stroke;
	}

	.cluster-label {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.7rem;
		font-weight: 600;
		fill: #3f3f46;
	}
</style>
