<!--
	@component
	Generates an SVG Beeswarm chart using a [d3-force simulation](https://github.com/d3/d3-force).
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
		strokeWidth = 1,
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
			.force("collide", forceCollide(r))
			.stop();

		const n = Math.ceil(
			Math.log(sim.alphaMin()) / Math.log(1 - sim.alphaDecay())
		);
		for (let i = 0; i < n; i += 1) sim.tick();
		return sim;
	});
</script>

<g class="bee-group">
	{#each simulation.nodes() as node}
		<circle
			fill={String($zGet(node))}
			{stroke}
			stroke-width={strokeWidth}
			cx={node.x}
			cy={node.y}
			{r}
		>
			{#if getTitle}
				<title>{getTitle(node)}</title>
			{/if}
		</circle>
	{/each}
</g>
