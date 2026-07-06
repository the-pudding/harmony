<!--
	@component
	Generates an HTML Beeswarm chart using a [d3-force simulation](https://github.com/d3/d3-force).
 -->
<script lang="ts">
	import type { LayerCakeContext } from "$types/layercake";
	import { getContext } from "svelte";
	import {
		forceSimulation,
		forceX,
		forceY,
		forceCollide,
		type SimulationNodeDatum
	} from "d3-force";

	const { data, xGet, height, zGet } =
		getContext<LayerCakeContext>("LayerCake");
	let {
		r = 4,
		strokeWidth = 0.5,
		stroke = "#fff",
		xStrength = 0.95,
		yStrength = 0.075,
		getTitle = undefined
	}: {
		r?: number;
		strokeWidth?: number;
		stroke?: string;
		xStrength?: number;
		yStrength?: number;
		getTitle?: (node: SimulationNodeDatum) => string;
	} = $props();

	type BeeNode = SimulationNodeDatum & Record<string, unknown>;

	const simulation = $derived.by(() => {
		const nodes: BeeNode[] = $data.map((d: Record<string, unknown>) => ({
			...d
		}));
		const sim = forceSimulation(nodes)
			.force(
				"x",
				forceX<BeeNode>()
					.x((d) => $xGet(d))
					.strength(xStrength)
			)
			.force(
				"y",
				forceY<BeeNode>()
					.y($height / 2)
					.strength(yStrength)
			)
			.force("collide", forceCollide(r + strokeWidth / 2))
			.stop();

		const n = Math.ceil(
			Math.log(sim.alphaMin()) / Math.log(1 - sim.alphaDecay())
		);
		for (let i = 0; i < n; i += 1) sim.tick();
		return sim;
	});
</script>

<div class="bee-group">
	{#each simulation.nodes() as node}
		<div
			class="bee"
			style="
				left:{node.x}px;
				top: {node.y}px;
				width: {r * 2}px;
				height: {r * 2}px;
				background: {$zGet(node)};
				border-width: {strokeWidth}px;
				border-color: {stroke};
				"
		>
			{#if getTitle}
				<div class="title">{getTitle(node)}</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.bee {
		position: absolute;
		border-style: solid;
		border-radius: 50%;
		transform: translate(-50%, -50%);
	}
	.title {
		display: none;
		white-space: nowrap;
		padding: 0 3px;
		border-radius: 3px;
		font-size: 12px;
		pointer-events: none;
		position: absolute;
		top: -15px;
		left: 5px;
		z-index: 9999;
	}
	.bee:hover .title {
		display: block;
	}
</style>
