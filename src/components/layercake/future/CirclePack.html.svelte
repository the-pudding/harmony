<!--
  @component
  Generates an HTML circle pack chart using [d3-hierarchy](https://github.com/d3/d3-hierarchy).
 -->
<script lang="ts">
	import type { LayerCakeContext } from "$types/layercake";
	import { stratify, pack, hierarchy, type HierarchyNode } from "d3-hierarchy";
	import { getContext } from "svelte";
	import { format } from "d3-format";

	const { width, height, data } = getContext<LayerCakeContext>("LayerCake");

	let {
		idKey = "id",
		parentKey = undefined,
		valueKey = "value",
		labelVisibilityThreshold = (r: number) => r > 25,
		fill = "#fff",
		stroke = "#999",
		strokeWidth = 1,
		textColor = "#333",
		textStroke = "#000",
		textStrokeWidth = 0,
		sortBy = (
			a: HierarchyNode<Record<string, unknown>>,
			b: HierarchyNode<Record<string, unknown>>
		) => Number(b.data[valueKey] ?? 0) - Number(a.data[valueKey] ?? 0),
		spacing = 0
	} = $props();

	const syntheticParentKey = "all";

	const rows = $derived($data as Record<string, unknown>[]);
	const dataset = $derived(
		parentKey === undefined ? [...rows, { [idKey]: syntheticParentKey }] : rows
	);

	const stratifier = $derived(
		stratify<Record<string, unknown>>()
			.id((d) => String(d[idKey]))
			.parentId((d) => {
				if (d[idKey] === syntheticParentKey) return "";
				return String(d[parentKey as string] ?? syntheticParentKey);
			})
	);

	const packer = $derived(
		pack<Record<string, unknown>>().size([$width, $height]).padding(spacing)
	);

	const stratified = $derived(stratifier(dataset));

	const root = $derived(
		hierarchy(stratified)
			.sum((d) => (d.data[valueKey] as number) || 1)
			.sort((a, b) =>
				sortBy(
					a as unknown as HierarchyNode<Record<string, unknown>>,
					b as unknown as HierarchyNode<Record<string, unknown>>
				)
			)
	);

	const packed = $derived(
		packer(root as unknown as HierarchyNode<Record<string, unknown>>)
	);

	const descendants = $derived(packed.descendants());

	const titleCase = (d: string) => d.replace(/^\w/, (w) => w.toUpperCase());
	const commas = format(",");
</script>

<div class="circle-pack" data-has-parent-key={parentKey !== undefined}>
	{#each descendants as d}
		<div
			class="circle-group"
			data-id={d.data.id}
			data-visible={labelVisibilityThreshold(d.r)}
		>
			<div
				class="circle"
				style="left:{d.x}px;top:{d.y}px;width:{d.r * 2}px;height:{d.r *
					2}px;background-color:{fill};border: {strokeWidth}px solid {stroke};"
			/>
			<div
				class="text-group"
				style="
            color:{textColor};
            text-shadow:
              -{textStrokeWidth}px -{textStrokeWidth}px 0 {textStroke},
              {textStrokeWidth}px -{textStrokeWidth}px 0 {textStroke},
              -{textStrokeWidth}px {textStrokeWidth}px 0 {textStroke},
              {textStrokeWidth}px {textStrokeWidth}px 0 {textStroke};
            left:{d.x}px;
            top:{d.y - (labelVisibilityThreshold(d.r) ? 0 : d.r + 4)}px;
          "
			>
				<div class="text">{titleCase(String(d.data.id))}</div>
				{#if (d.data as Record<string, unknown>).data}
					{@const nodeData = (d.data as Record<string, Record<string, unknown>>)
						.data}
					<div class="text value">
						{commas(Number(nodeData[valueKey] ?? 0))}
					</div>
				{/if}
			</div>
		</div>
	{/each}
</div>

<style>
	.circle-pack {
		position: relative;
		width: 100%;
		height: 100%;
	}
	.circle,
	.text-group {
		position: absolute;
	}
	.circle {
		transform: translate(-50%, -50%);
	}
	.circle-pack[data-has-parent-key="false"] .circle-group[data-id="all"] {
		display: none;
	}
	.circle-group[data-visible="false"] .text-group {
		display: none;
		padding: 4px 7px;
		background: #fff;
		border: 1px solid #ccc;
		transform: translate(-50%, -100%);
		top: -4px;
	}
	.circle-group[data-visible="false"]:hover .text-group {
		z-index: 999;
		display: block !important;
		text-shadow: none !important;
		color: #000 !important;
	}
	.circle-group[data-visible="false"]:hover .circle {
		border-color: #000 !important;
	}
	.text-group {
		width: auto;
		top: 50%;
		left: 50%;
		text-align: center;
		transform: translate(-50%, -50%);
		white-space: nowrap;
		pointer-events: none;
		cursor: pointer;
		line-height: 13px;
	}
	.text {
		width: 100%;
		font-size: 11px;
	}
	.text.value {
		font-size: 11px;
	}
	.circle {
		border-radius: 50%;
		top: 0;
		left: 0;
	}
</style>
