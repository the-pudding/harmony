<script lang="ts">
	import { onMount } from "svelte";
	import * as d3 from "d3";
	import type { ProgressionNetworkData, NetworkNode, NetworkLink } from "$data/progression-network.js";
	import type { GroupedSong } from "../../../data/songBrowser.js";
	import coreProgressionsData from "$data/core-progressions.js";
	import {
		selectFinalProgressions,
		buildFinalChordAnnotations
	} from "../define-chord-progression/progression-matching-logic/finalProgressionSelection.js";
	import { EXPLAINED_THRESHOLD_PERCENT } from "../define-chord-progression/constants.js";
	import FinalAnnotatedSong from "../define-chord-progression/components/FinalAnnotatedSong.svelte";

	type Props = {
		data: ProgressionNetworkData;
		songs: GroupedSong[];
	};

	const { data, songs }: Props = $props();

	let svgEl: SVGSVGElement;
	let containerEl: HTMLDivElement;

	type TooltipAnchor = { x: number; y: number };
	let tooltipAnchor = $state<TooltipAnchor | null>(null);
	let hoveredSongKey = $state<string | null>(null);
	let activeProgression = $state<string | null>(null);

	const songByKey = $derived(new Map(songs.map((s) => [s.songKey, s])));

	const hoveredSong = $derived(
		hoveredSongKey ? (songByKey.get(hoveredSongKey) ?? null) : null
	);

	const finalSelection = $derived(
		hoveredSong
			? selectFinalProgressions(hoveredSong, coreProgressionsData)
			: null
	);

	const songAnnotations = $derived(
		hoveredSong && finalSelection
			? buildFinalChordAnnotations(hoveredSong, finalSelection)
			: []
	);

	const explainedPercent = $derived(finalSelection?.explainedPercent ?? 0);
	const isExplained = $derived(explainedPercent > EXPLAINED_THRESHOLD_PERCENT);
	const finalMatches = $derived(
		finalSelection
			? [...finalSelection.coreSelected, ...finalSelection.gapSelected]
			: []
	);

	const GROUP_RADIUS = 22;
	const PROGRESSION_RADIUS = 12;
	const SONG_RADIUS = 4;

	const GROUP_COLOR = "#6366f1";
	const PROGRESSION_COLOR = "#34d399";
	const SONG_COLOR = "#52525b";
	const SONG_HOVER_COLOR = "#a1a1aa";

	const DIM_OPACITY = 0.08;
	const FULL_NODE_OPACITY = 1;
	const SONG_BASE_OPACITY = 0.7;

	const nodeRadius = (n: NetworkNode): number => {
		if (n.type === "group") return GROUP_RADIUS;
		if (n.type === "progression") return PROGRESSION_RADIUS;
		return SONG_RADIUS;
	};

	const nodeColor = (n: NetworkNode): string => {
		if (n.type === "group") return GROUP_COLOR;
		if (n.type === "progression") return PROGRESSION_COLOR;
		return SONG_COLOR;
	};

	const linkStrength = (l: NetworkLink): number =>
		l.type === "group-progression" ? 0.9 : 0.15;

	const linkDistance = (l: NetworkLink): number =>
		l.type === "group-progression" ? 80 : 140;

	onMount(() => {
		const width = containerEl.clientWidth;
		const height = containerEl.clientHeight;

		type SimNode = NetworkNode & d3.SimulationNodeDatum;
		type SimLink = { source: SimNode; target: SimNode; type: NetworkLink["type"] };

		const nodes: SimNode[] = data.nodes.map((n) => ({ ...n }));
		const nodeById = new Map(nodes.map((n) => [n.id, n]));

		const links: SimLink[] = data.links.flatMap((l) => {
			const source = nodeById.get(l.source);
			const target = nodeById.get(l.target);
			if (!source || !target) return [];
			return [{ source, target, type: l.type }];
		});

		const svg = d3
			.select(svgEl)
			.attr("width", width)
			.attr("height", height);

		svg.selectAll("*").remove();

		const g = svg.append("g");

		svg.call(
			d3.zoom<SVGSVGElement, unknown>()
				.scaleExtent([0.15, 4])
				.on("zoom", (event) => {
					g.attr("transform", event.transform);
				})
		);

		const simulation = d3
			.forceSimulation<SimNode>(nodes)
			.force(
				"link",
				d3
					.forceLink<SimNode, SimLink>(links)
					.id((n) => n.id)
					.strength((l) => linkStrength(l))
					.distance((l) => linkDistance(l))
			)
			.force("charge", d3.forceManyBody().strength(-120))
			.force("center", d3.forceCenter(width / 2, height / 2))
			.force("collision", d3.forceCollide<SimNode>((n) => nodeRadius(n) + 3));

		const linkGroup = g
			.append("g")
			.attr("stroke-opacity", 0.25)
			.selectAll<SVGLineElement, SimLink>("line")
			.data(links)
			.join("line")
			.attr("stroke", (l) => (l.type === "group-progression" ? "#6366f1" : "#3f3f46"))
			.attr("stroke-width", (l) => (l.type === "group-progression" ? 1.5 : 0.75));

		const nodeGroup = g
			.append("g")
			.selectAll<SVGGElement, SimNode>("g")
			.data(nodes)
			.join("g")
			.style("cursor", (n) => (n.type === "song" ? "pointer" : "default"))
			.call(
				d3
					.drag<SVGGElement, SimNode>()
					.on("start", (event, n) => {
						if (!event.active) simulation.alphaTarget(0.3).restart();
						n.fx = n.x;
						n.fy = n.y;
					})
					.on("drag", (event, n) => {
						n.fx = event.x;
						n.fy = event.y;
					})
					.on("end", (event, n) => {
						if (!event.active) simulation.alphaTarget(0);
						n.fx = null;
						n.fy = null;
					})
			);

		nodeGroup
			.append("circle")
			.attr("r", (n) => nodeRadius(n))
			.attr("fill", (n) => nodeColor(n))
			.attr("fill-opacity", (n) => (n.type === "song" ? SONG_BASE_OPACITY : FULL_NODE_OPACITY))
			.attr("stroke", (n) => (n.type === "song" ? "none" : "rgba(255,255,255,0.15)"))
			.attr("stroke-width", 1.5);

		const labelNodes = nodes.filter((n) => n.type !== "song");
		const labelGroup = g
			.append("g")
			.selectAll<SVGTextElement, SimNode>("text")
			.data(labelNodes)
			.join("text")
			.attr("text-anchor", "middle")
			.attr("dominant-baseline", "middle")
			.attr("fill", "#f4f4f5")
			.attr("font-family", "'JetBrains Mono', 'Fira Code', ui-monospace, monospace")
			.attr("font-size", (n) => (n.type === "group" ? "9px" : "7px"))
			.attr("font-weight", (n) => (n.type === "group" ? "700" : "500"))
			.attr("pointer-events", "none")
			.each(function (n) {
				const el = d3.select(this);
				const label = n.type === "group"
					? n.label
					: n.type === "progression"
						? n.chordProgression
						: "";
				const maxWidth = nodeRadius(n) * 2 - 4;
				const words = label.split(" ");
				const lines: string[] = [];
				let current = "";
				for (const word of words) {
					const test = current ? `${current} ${word}` : word;
					if (test.length * (n.type === "group" ? 5.5 : 4.5) > maxWidth && current) {
						lines.push(current);
						current = word;
					} else {
						current = test;
					}
				}
				if (current) lines.push(current);
				const lineHeight = n.type === "group" ? 10 : 8;
				const yStart = -((lines.length - 1) / 2) * lineHeight;
				lines.forEach((line, i) => {
					el.append("tspan")
						.attr("x", 0)
						.attr("dy", i === 0 ? yStart : lineHeight)
						.text(line);
				});
			});

		const neighborIdsOf = (hoveredId: string): Set<string> => {
			const ids = new Set<string>([hoveredId]);
			for (const l of links) {
				if (l.source.id === hoveredId) ids.add(l.target.id);
				if (l.target.id === hoveredId) ids.add(l.source.id);
			}
			return ids;
		};

		const applyHighlight = (hoveredId: string) => {
			const neighbors = neighborIdsOf(hoveredId);
			nodeGroup
				.transition().duration(150)
				.attr("opacity", (n) => (neighbors.has(n.id) ? FULL_NODE_OPACITY : DIM_OPACITY));
			linkGroup
				.transition().duration(150)
				.attr("stroke-opacity", (l) =>
					l.source.id === hoveredId || l.target.id === hoveredId ? 0.6 : DIM_OPACITY
				);
			labelGroup
				.transition().duration(150)
				.attr("opacity", (n) => (neighbors.has(n.id) ? FULL_NODE_OPACITY : DIM_OPACITY));
		};

		const clearHighlight = () => {
			nodeGroup.transition().duration(150).attr("opacity", FULL_NODE_OPACITY);
			linkGroup.transition().duration(150).attr("stroke-opacity", 0.25);
			labelGroup.transition().duration(150).attr("opacity", FULL_NODE_OPACITY);
		};

		nodeGroup
			.on("mouseover", (event: MouseEvent, n) => {
				applyHighlight(n.id);

				if (n.type === "song") {
					d3.select(event.currentTarget as SVGGElement)
						.select("circle")
						.attr("fill", SONG_HOVER_COLOR);
					hoveredSongKey = n.songKey;
				}

				const rect = svgEl.getBoundingClientRect();
				tooltipAnchor = {
					x: event.clientX - rect.left,
					y: event.clientY - rect.top
				};
			})
			.on("mousemove", (event: MouseEvent) => {
				const rect = svgEl.getBoundingClientRect();
				tooltipAnchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
			})
			.on("mouseout", (event: MouseEvent, n) => {
				clearHighlight();
				tooltipAnchor = null;
				hoveredSongKey = null;

				if (n.type === "song") {
					d3.select(event.currentTarget as SVGGElement)
						.select("circle")
						.attr("fill", nodeColor(n));
				}
			})
			.on("click", (_event: MouseEvent, n) => {
				if (n.type === "song") {
					window.open(`/demo/define-chord-progression/?song=${n.songKey}`, "_blank");
				}
			});

		simulation.on("tick", () => {
			linkGroup
				.attr("x1", (l) => l.source.x ?? 0)
				.attr("y1", (l) => l.source.y ?? 0)
				.attr("x2", (l) => l.target.x ?? 0)
				.attr("y2", (l) => l.target.y ?? 0);

			nodeGroup.attr("transform", (n) => `translate(${n.x ?? 0},${n.y ?? 0})`);

			labelGroup.attr("transform", (n) => `translate(${n.x ?? 0},${n.y ?? 0})`);
		});

		return () => simulation.stop();
	});

	const TOOLTIP_WIDTH = 400;
	const TOOLTIP_OFFSET = 16;

	const tooltipStyle = $derived.by(() => {
		if (!tooltipAnchor || !containerEl) return "";
		const containerWidth = containerEl.clientWidth;
		const flipLeft = tooltipAnchor.x + TOOLTIP_OFFSET + TOOLTIP_WIDTH > containerWidth;
		const left = flipLeft
			? tooltipAnchor.x - TOOLTIP_OFFSET - TOOLTIP_WIDTH
			: tooltipAnchor.x + TOOLTIP_OFFSET;
		const top = Math.max(8, tooltipAnchor.y - 24);
		return `left: ${left}px; top: ${top}px; width: ${TOOLTIP_WIDTH}px;`;
	});
</script>

<div class="graph-container" bind:this={containerEl}>
	<svg bind:this={svgEl}></svg>

	{#if tooltipAnchor}
		<div class="tooltip" style={tooltipStyle}>
			{#if hoveredSong && finalSelection}
				<FinalAnnotatedSong
					song={hoveredSong}
					matches={finalMatches}
					annotations={songAnnotations}
					{explainedPercent}
					{isExplained}
					{activeProgression}
					onselect={(p) => { activeProgression = activeProgression === p ? null : p; }}
				/>
			{:else if tooltipAnchor}
				<span class="tooltip-hint">hover a node</span>
			{/if}
		</div>
	{/if}

	<div class="legend">
		<div class="legend-item">
			<span class="legend-dot" style="background: {GROUP_COLOR};"></span>
			<span>group</span>
		</div>
		<div class="legend-item">
			<span class="legend-dot" style="background: {PROGRESSION_COLOR};"></span>
			<span>progression</span>
		</div>
		<div class="legend-item">
			<span class="legend-dot" style="background: {SONG_COLOR};"></span>
			<span>song (click to open)</span>
		</div>
	</div>
</div>

<style>
	.graph-container {
		position: relative;
		width: 100%;
		height: 100%;
	}

	svg {
		display: block;
		width: 100%;
		height: 100%;
	}

	.tooltip {
		position: absolute;
		pointer-events: none;
		background: rgba(9, 9, 11, 0.96);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.5rem;
		padding: 0.875rem 1rem;
		z-index: 10;
		backdrop-filter: blur(8px);
		max-height: calc(100% - 2rem);
		overflow-y: auto;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.75rem;
		color: #f4f4f5;
	}

	.tooltip-hint {
		font-size: 0.625rem;
		color: #52525b;
	}

	.legend {
		position: absolute;
		bottom: 1rem;
		left: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		background: rgba(9, 9, 11, 0.75);
		border: 1px solid rgba(63, 63, 70, 0.6);
		border-radius: 0.375rem;
		padding: 0.625rem 0.875rem;
		pointer-events: none;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.625rem;
		color: #a1a1aa;
	}

	.legend-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}
</style>
