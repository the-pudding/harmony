<!--
	@component
	Generates an SVG Beeswarm chart.
 -->
<script lang="ts">
	import type { LayerCakeContext } from "$types/layercake";
	import { getContext } from "svelte";

	const { data, xGet, zGet, height, config } =
		getContext<LayerCakeContext>("LayerCake");
	let {
		r = 3,
		strokeWidth = 0,
		stroke = "#fff",
		spacing = 1.5,
		getTitle = undefined
	}: {
		r?: number;
		strokeWidth?: number;
		stroke?: string;
		spacing?: number;
		getTitle?: (d: { data: unknown }) => string;
	} = $props();

	type DodgeNode = {
		x: number;
		y: number;
		next: DodgeNode | null;
		data: Record<string, unknown>;
		[key: string]: unknown;
	};

	const zField = $derived($config.z ?? "z");
	const yOffset = $derived($height - r - spacing - strokeWidth / 2);

	const circles = $derived(
		dodge($data as Record<string, unknown>[], {
			rds: r * 2 + spacing + strokeWidth,
			x: $xGet,
			zField
		})
	);

	function dodge(
		data: Record<string, unknown>[],
		{
			rds = 1,
			x = () => 0,
			zField
		}: { rds?: number; x?: (d: unknown) => number; zField: string }
	) {
		const radius2 = rds ** 2;
		const nodes: DodgeNode[] = data
			.map((d) => ({ x: x(d), [zField]: d[zField], data: d, y: 0, next: null }))
			.sort((a, b) => a.x - b.x);
		const epsilon = 1e-3;
		let head: DodgeNode | null = null;
		let tail: DodgeNode | null = null;

		function intersects(x: number, y: number) {
			let a = head;
			while (a) {
				if (radius2 - epsilon > (a.x - x) ** 2 + (a.y - y) ** 2) return true;
				a = a.next;
			}
			return false;
		}

		for (const b of nodes) {
			while (head && head.x < b.x - radius2) head = head.next;

			if (intersects(b.x, (b.y = 0))) {
				let a = head;
				b.y = Infinity;
				do {
					const y = a!.y + Math.sqrt(radius2 - (a!.x - b.x) ** 2);
					if (y < b.y && !intersects(b.x, y)) b.y = y;
					a = a!.next;
				} while (a);
			}

			b.next = null;
			if (head === null) head = tail = b;
			else tail = tail!.next = b;
		}

		return nodes;
	}
</script>

<g class="bee-group">
	{#each circles as d}
		<circle
			fill={String($zGet(d))}
			{stroke}
			stroke-width={strokeWidth}
			cx={d.x}
			cy={yOffset - d.y}
			{r}
		>
			{#if getTitle}
				<title>{getTitle(d)}</title>
			{/if}
		</circle>
	{/each}
</g>
