<script lang="ts">
	import type { PathStats, SankeyLayer } from "./computeNextChordProbabilities.js";

	type Props = { layers: SankeyLayer[]; pathStats: PathStats | null };
	const { layers, pathStats }: Props = $props();

	const CHART_HEIGHT = 320;
	const STATS_AREA_HEIGHT = 36;
	const NODE_WIDTH = 52;
	const COL_GAP = 80;
	const NODE_GAP = 3;
	const LABEL_MIN_HEIGHT = 13;
	const LABEL_FONT_SIZE = 11;
	const PCT_FONT_SIZE = 9;

	const CHOSEN_COLOR = "#89b4fa";
	const UNCHOSEN_NODE_FILL = "rgba(255,255,255,0.1)";
	const UNCHOSEN_NODE_STROKE = "rgba(255,255,255,0.18)";
	const CHOSEN_LINK_COLOR = "#89b4fa";
	const UNCHOSEN_LINK_COLOR = "rgba(255,255,255,0.05)";
	const CHOSEN_LABEL_COLOR = "#ffffff";
	const UNCHOSEN_LABEL_COLOR = "#71717a";

	type LayoutNode = {
		token: string;
		count: number;
		isChosen: boolean;
		layerTotalCount: number;
		x: number;
		y: number;
		height: number;
		centerY: number;
	};

	type LayoutLink = {
		x1: number;
		y1: number;
		x2: number;
		y2: number;
		isChosenPath: boolean;
	};

	const layout = $derived.by(() => {
		if (layers.length === 0) return { nodes: [], links: [], totalWidth: 0 };

		const allNodes: LayoutNode[] = [];
		const links: LayoutLink[] = [];
		const totalWidth = layers.length * NODE_WIDTH + (layers.length - 1) * COL_GAP;
		const layerLayouts: LayoutNode[][] = [];

		// Cascade: each layer fits within the height of the chosen node from the previous layer.
		// Layer 0's chosen node spans the full chart height (it's always the single first chord).
		let cascadeHeight = CHART_HEIGHT;
		let cascadeYStart = 0;

		for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
			const layer = layers[layerIdx];
			const x = layerIdx * (NODE_WIDTH + COL_GAP);
			const available = layerIdx === 0 ? CHART_HEIGHT : cascadeHeight;
			const yOrigin = layerIdx === 0 ? 0 : cascadeYStart;
			const total = layer.totalCount || 1;

			// Proportional heights — no artificial minimum so the cascade stays accurate
			const rawHeights = layer.nodes.map((n) => (n.count / total) * available);

			// Account for gaps between nodes and scale to fit exactly
			const gapTotal = Math.max(0, (layer.nodes.length - 1) * NODE_GAP);
			const usable = Math.max(0, available - gapTotal);
			const rawSum = rawHeights.reduce((a, b) => a + b, 0);
			const scale = rawSum > 0 ? usable / rawSum : 1;
			const heights = rawHeights.map((h) => h * scale);

			const totalUsed = heights.reduce((a, b) => a + b, 0) + gapTotal;
			// Center the stack within the available band
			let y = yOrigin + (available - totalUsed) / 2;

			const layerNodes: LayoutNode[] = layer.nodes.map((node, nodeIdx) => {
				const height = heights[nodeIdx];
				const centerY = y + height / 2;
				const ln: LayoutNode = {
					...node,
					layerTotalCount: total,
					x,
					y,
					height,
					centerY,
				};
				y += height + NODE_GAP;
				return ln;
			});

			layerLayouts.push(layerNodes);
			allNodes.push(...layerNodes);

			// Next layer is constrained to the chosen node's bounds
			const chosen = layerNodes.find((n) => n.isChosen);
			if (chosen) {
				cascadeHeight = chosen.height;
				cascadeYStart = chosen.y;
			}
		}

		// Build links from each layer's chosen node to all nodes in the next layer
		for (let i = 0; i < layerLayouts.length - 1; i++) {
			const srcChosen =
				layerLayouts[i].find((n) => n.isChosen) ?? layerLayouts[i][0];
			if (!srcChosen) continue;

			const x1 = srcChosen.x + NODE_WIDTH;
			const x2 = layerLayouts[i + 1][0]?.x ?? x1 + COL_GAP;

			for (const dest of layerLayouts[i + 1]) {
				links.push({
					x1,
					y1: srcChosen.centerY,
					x2,
					y2: dest.centerY,
					isChosenPath: dest.isChosen,
				});
			}
		}

		return { nodes: allNodes, links, totalWidth };
	});

	const svgHeight = $derived(pathStats ? CHART_HEIGHT + STATS_AREA_HEIGHT : CHART_HEIGHT);

	const statsLabelX = $derived(
		layers.length > 0 ? (layers.length - 1) * (NODE_WIDTH + COL_GAP) + NODE_WIDTH / 2 : 0
	);

	const statsPct = $derived(
		pathStats && pathStats.totalSongs > 0
			? Math.round((pathStats.matchingSongs / pathStats.totalSongs) * 100)
			: null
	);

	function bezierPath(link: LayoutLink): string {
		const mx = (link.x1 + link.x2) / 2;
		return `M ${link.x1} ${link.y1} C ${mx} ${link.y1}, ${mx} ${link.y2}, ${link.x2} ${link.y2}`;
	}
</script>

<div class="chart-wrap" style:height="{svgHeight}px">
	<svg
		class="chart"
		width={layout.totalWidth}
		height={svgHeight}
		role="img"
		aria-label="Chord path likelihood Sankey diagram"
	>
		<!-- Links drawn behind nodes -->
		{#each layout.links as link, i (i)}
			<path
				class="link"
				d={bezierPath(link)}
				fill="none"
				stroke={link.isChosenPath ? CHOSEN_LINK_COLOR : UNCHOSEN_LINK_COLOR}
				stroke-width={link.isChosenPath ? 2 : 1}
				opacity={link.isChosenPath ? 0.55 : 1}
			/>
		{/each}

		<!-- Nodes -->
		{#each layout.nodes as node (`${node.token}-${node.x}`)}
			{@const fill = node.isChosen ? CHOSEN_COLOR : UNCHOSEN_NODE_FILL}
			{@const stroke = node.isChosen ? CHOSEN_COLOR : UNCHOSEN_NODE_STROKE}
			{@const labelColor = node.isChosen ? CHOSEN_LABEL_COLOR : UNCHOSEN_LABEL_COLOR}
			{@const showLabel = node.height >= LABEL_MIN_HEIGHT}
			{@const pct = Math.round((node.count / (node.layerTotalCount || 1)) * 100)}

			<rect
				x={node.x}
				y={node.y}
				width={NODE_WIDTH}
				height={Math.max(node.height, 1)}
				rx="3"
				{fill}
				{stroke}
				stroke-width="1"
				opacity={node.isChosen ? 1 : 0.7}
			/>

			{#if showLabel}
				<text
					class="node-label"
					x={node.x + NODE_WIDTH / 2}
					y={node.centerY}
					text-anchor="middle"
					dominant-baseline="middle"
					fill={labelColor}
					font-size={LABEL_FONT_SIZE}
					font-weight={node.isChosen ? "600" : "400"}
				>
					{node.token}
				</text>

				{#if node.isChosen && node.height >= LABEL_MIN_HEIGHT + PCT_FONT_SIZE + 4}
					<text
						class="pct-label"
						x={node.x + NODE_WIDTH / 2}
						y={node.centerY + LABEL_FONT_SIZE / 2 + 3}
						text-anchor="middle"
						dominant-baseline="hanging"
						fill={labelColor}
						font-size={PCT_FONT_SIZE}
						opacity="0.65"
					>
						{pct}%
					</text>
				{/if}
			{/if}
		{/each}

		<!-- Path stats label below the last column -->
		{#if pathStats && statsPct !== null}
			<text
				class="stats-label stats-pct"
				x={statsLabelX}
				y={CHART_HEIGHT + 12}
				text-anchor="middle"
				dominant-baseline="hanging"
			>
				{statsPct}% of songs
			</text>
			<text
				class="stats-label stats-count"
				x={statsLabelX}
				y={CHART_HEIGHT + 24}
				text-anchor="middle"
				dominant-baseline="hanging"
			>
				({pathStats.matchingSongs.toLocaleString()} songs)
			</text>
		{/if}
	</svg>
</div>

<style>
	.chart-wrap {
		width: 100%;
		overflow-x: auto;
		overflow-y: hidden;
	}

	.chart {
		display: block;
	}

	.node-label,
	.pct-label,
	.stats-label {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		pointer-events: none;
		user-select: none;
	}

	.stats-pct {
		fill: #a5b4fc;
		font-size: 11px;
		font-weight: 500;
	}

	.stats-count {
		fill: #52525b;
		font-size: 9px;
	}
</style>
