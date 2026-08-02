<script lang="ts">
	import { Graph, type GraphConfigInterface } from "@cosmograph/cosmos";
	import type {
		ProgressionNetworkData,
		NetworkNode,
		NetworkLink
	} from "$data/progression-network.js";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import type { ProgressionWithMatchStats } from "../../define-chord-progression/progression-matching-logic/progressionMatchAnalysis.js";
	import { CORE_PROGRESSION_PALETTE } from "../../define-chord-progression/components/progressionColors.js";
	import type { ScaleName } from "../../../../chord-processing/scales.js";
	import ProgressionMatchButton from "../../define-chord-progression/components/ProgressionMatchButton.svelte";
	import SongTooltip from "../components/SongTooltip.svelte";
	import {
		anchorFromMouseEvent,
		hoverCardStyle,
		type HoverCardAnchor
	} from "../components/hoverCardPosition.js";

	type Props = {
		data: ProgressionNetworkData;
		songs: GroupedSong[];
	};

	const { data, songs }: Props = $props();

	let containerEl = $state<HTMLDivElement | null>(null);

	let tooltipAnchor = $state<HoverCardAnchor | null>(null);
	type HoveredInfo = { id: string; type: NetworkNode["type"] };
	let hoveredInfo = $state<HoveredInfo | null>(null);

	type LabelData = { index: number; x: number; y: number; node: NetworkNode };
	let labelPositions = $state<LabelData[]>([]);

	const songByKey = $derived(new Map(songs.map((s) => [s.songKey, s])));

	const hoveredNode = $derived(
		hoveredInfo
			? (data.nodes.find((n) => n.id === hoveredInfo!.id) ?? null)
			: null
	);

	const hoveredSong = $derived(
		hoveredNode?.type === "song"
			? (songByKey.get(hoveredNode.songKey) ?? null)
			: null
	);

	const groupProgressionNodes = $derived.by(() => {
		if (hoveredNode?.type !== "group") return [];
		const groupId = hoveredNode.id;
		const progressionIds = new Set(
			data.links
				.filter((l) => l.type === "group-progression" && l.source === groupId)
				.map((l) => l.target)
		);
		return data.nodes.filter(
			(n) => n.type === "progression" && progressionIds.has(n.id)
		);
	});

	const progressionMatchStub = $derived.by(
		(): ProgressionWithMatchStats | null => {
			if (hoveredNode?.type !== "progression") return null;
			return {
				name: hoveredNode.label,
				chordProgression: hoveredNode.chordProgression,
				scale: hoveredNode.scale as ScaleName,
				description: "",
				matchCount: 0,
				coveragePercent: 0,
				isCoreProgression: true,
				highlightPalette: CORE_PROGRESSION_PALETTE,
				parsedProgression: []
			};
		}
	);

	const GROUP_SIZE = 22;
	const PROGRESSION_SIZE = 12;
	const MIN_SONG_SIZE = 1.5;
	const MAX_SONG_SIZE = 4;
	const SONG_SIZE_REF_COUNT = 500;
	const SONG_SIZE_AT_REF = 3;

	const GROUP_COLOR = "#6366f1";
	const PROGRESSION_COLOR = "#34d399";
	const SONG_COLOR = "#52525b";

	const tooltipStyle = $derived(
		containerEl ? hoverCardStyle(tooltipAnchor, containerEl.clientWidth) : ""
	);

	function hexToRgb01(hex: string): [number, number, number] {
		return [
			parseInt(hex.slice(1, 3), 16) / 255,
			parseInt(hex.slice(3, 5), 16) / 255,
			parseInt(hex.slice(5, 7), 16) / 255
		];
	}

	function clamp(value: number, min: number, max: number): number {
		return Math.min(Math.max(value, min), max);
	}

	function buildInitialPositions(nodeCount: number): Float32Array {
		const SPACE_SIZE = 4096;
		const pos = new Float32Array(nodeCount * 2);
		for (let i = 0; i < nodeCount; i++) {
			pos[i * 2] = Math.random() * SPACE_SIZE;
			pos[i * 2 + 1] = Math.random() * SPACE_SIZE;
		}
		return pos;
	}

	function buildBuffers(nodes: NetworkNode[], links: NetworkLink[]) {
		const songCount = nodes.filter((n) => n.type === "song").length;
		const songSize = clamp(
			SONG_SIZE_AT_REF *
				Math.sqrt(SONG_SIZE_REF_COUNT / Math.max(songCount, 1)),
			MIN_SONG_SIZE,
			MAX_SONG_SIZE
		);

		const pointColors = new Float32Array(nodes.length * 4);
		const pointSizes = new Float32Array(nodes.length);

		for (let i = 0; i < nodes.length; i++) {
			const n = nodes[i];
			const hex =
				n.type === "group"
					? GROUP_COLOR
					: n.type === "progression"
						? PROGRESSION_COLOR
						: SONG_COLOR;
			const size =
				n.type === "group"
					? GROUP_SIZE
					: n.type === "progression"
						? PROGRESSION_SIZE
						: songSize;
			const [r, g, b] = hexToRgb01(hex);
			pointColors[i * 4] = r;
			pointColors[i * 4 + 1] = g;
			pointColors[i * 4 + 2] = b;
			pointColors[i * 4 + 3] = 1;
			pointSizes[i] = size;
		}

		const nodeIndexById = new Map(nodes.map((n, i) => [n.id, i]));
		const linkPairs: number[] = [];
		const linkColorArr: number[] = [];
		const linkWidthArr: number[] = [];
		const linkStrengthArr: number[] = [];

		for (const l of links) {
			const srcIdx = nodeIndexById.get(l.source);
			const tgtIdx = nodeIndexById.get(l.target);
			if (srcIdx === undefined || tgtIdx === undefined) continue;

			linkPairs.push(srcIdx, tgtIdx);

			if (l.type === "group-progression") {
				const [r, g, b] = hexToRgb01(GROUP_COLOR);
				linkColorArr.push(r, g, b, 1);
				linkWidthArr.push(1.5);
				linkStrengthArr.push(0.9);
			} else {
				linkColorArr.push(60 / 255, 60 / 255, 70 / 255, 1);
				linkWidthArr.push(0.5);
				linkStrengthArr.push(0.15);
			}
		}

		return {
			linkFloat: new Float32Array(linkPairs),
			linkColors: new Float32Array(linkColorArr),
			linkWidths: new Float32Array(linkWidthArr),
			linkStrengths: new Float32Array(linkStrengthArr),
			pointColors,
			pointSizes
		};
	}

	$effect(() => {
		const nodes = data.nodes;
		const links = data.links;

		const container = containerEl;
		if (!container) return;

		const buffers = buildBuffers(nodes, links);

		const labelIndices = nodes
			.map((n, i) => ({ n, i }))
			.filter(({ n }) => n.type !== "song")
			.map(({ i }) => i);

		let updateLabels = () => {};

		const config: GraphConfigInterface = {
			backgroundColor: "#09090b",
			spaceSize: 4096,
			pointGreyoutOpacity: 0.25,
			linkGreyoutOpacity: 0.15,
			linkArrows: false,
			curvedLinks: false,
			renderHoveredPointRing: true,
			hoveredPointRingColor: "#f4f4f5",
			hoveredPointCursor: "pointer",
			enableDrag: true,
			fitViewOnInit: true,
			fitViewDelay: 300,
			simulationGravity: 0,
			simulationCenter: 0.1,
			simulationRepulsion: 0.4,
			simulationFriction: 0.9,
			simulationLinkSpring: 1,
			simulationLinkDistance: 30,
			simulationDecay: 1000,
			linkVisibilityDistanceRange: [50, 10000],
			linkVisibilityMinTransparency: 1,
			onSimulationTick: () => updateLabels(),
			onSimulationEnd: () => updateLabels(),
			onZoom: () => updateLabels(),
			onZoomEnd: () => updateLabels(),
			onPointMouseOver: (index, _pos, event) => {
				if (index === undefined) return;
				const node = nodes[index];
				if (!node) return;
				graph.selectPointByIndex(index, true);
				hoveredInfo = { id: node.id, type: node.type };
				if (event instanceof MouseEvent) {
					tooltipAnchor = anchorFromMouseEvent(event, container);
				}
			},
			onPointMouseOut: () => {
				graph.unselectPoints();
				hoveredInfo = null;
				tooltipAnchor = null;
			},
			onMouseMove: (_index, _pos, event) => {
				if (hoveredInfo) {
					tooltipAnchor = anchorFromMouseEvent(event, container);
				}
			},
			onClick: (index) => {
				if (index === undefined) return;
				const node = nodes[index];
				if (!node) return;
				if (node.type === "song") {
					window.open(
						`/demo/define-chord-progression/?song=${node.songKey}`,
						"_blank"
					);
				} else {
					window.open("/demo/core-progressions/", "_blank");
				}
			}
		};

		const graph = new Graph(container, config);

		updateLabels = () => {
			const allPositions = graph.getPointPositions();
			if (!allPositions.length) return;
			const newLabels: LabelData[] = [];
			for (const idx of labelIndices) {
				const spaceX = allPositions[idx * 2];
				const spaceY = allPositions[idx * 2 + 1];
				if (spaceX == null || spaceY == null) continue;
				const [screenX, screenY] = graph.spaceToScreenPosition([
					spaceX,
					spaceY
				]);
				newLabels.push({
					index: idx,
					x: screenX,
					y: screenY,
					node: nodes[idx]
				});
			}
			labelPositions = newLabels;
		};

		graph.setPointPositions(buildInitialPositions(nodes.length));
		graph.setPointColors(buffers.pointColors);
		graph.setPointSizes(buffers.pointSizes);
		graph.setLinks(buffers.linkFloat);
		graph.setLinkColors(buffers.linkColors);
		graph.setLinkWidths(buffers.linkWidths);
		graph.setLinkStrength(buffers.linkStrengths);
		graph.render();

		return () => {
			graph.destroy();
			labelPositions = [];
		};
	});
</script>

<div class="graph-container" bind:this={containerEl}>
	<div class="label-overlay">
		{#each labelPositions as label (label.index)}
			<div
				class="label"
				class:label-group={label.node.type === "group"}
				class:label-progression={label.node.type === "progression"}
				style="left: {label.x}px; top: {label.y}px;"
			>
				{#if label.node.type === "group"}
					{label.node.label}
				{:else if label.node.type === "progression"}
					<span class="prog-name">{label.node.label}</span>
					<span class="prog-chords">{label.node.chordProgression}</span>
				{/if}
			</div>
		{/each}
	</div>

	{#if tooltipAnchor && hoveredNode}
		<div class="tooltip" style={tooltipStyle}>
			{#if hoveredNode.type === "song" && hoveredSong}
				<SongTooltip song={hoveredSong} />
			{:else if hoveredNode.type === "group"}
				<p class="group-name">{hoveredNode.label}</p>
				<ul class="progression-list">
					{#each groupProgressionNodes as prog (prog.id)}
						{#if prog.type === "progression"}
							<li class="progression-item">
								<span class="progression-name">{prog.label}</span>
								<span class="progression-chords">{prog.chordProgression}</span>
							</li>
						{/if}
					{/each}
				</ul>
			{:else if hoveredNode.type === "progression" && progressionMatchStub}
				<ProgressionMatchButton
					match={progressionMatchStub}
					active={false}
					onselect={() => {}}
				/>
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
			<span>song</span>
		</div>
	</div>
</div>

<style>
	.graph-container {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.label-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 1;
	}

	.label {
		position: absolute;
		transform: translate(-50%, -50%);
		text-align: center;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		color: #f4f4f5;
		text-shadow:
			0 0 3px #000,
			0 0 6px #000,
			-1px -1px 0 #000,
			1px 1px 0 #000;
		line-height: 1.2;
		user-select: none;
	}

	.label-group {
		font-size: 9px;
		font-weight: 700;
		max-width: 44px;
		white-space: normal;
		word-break: break-word;
	}

	.label-progression {
		font-size: 6px;
		font-weight: 500;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
		white-space: nowrap;
	}

	.prog-name {
		color: #d4d4d8;
	}

	.prog-chords {
		color: #a1a1aa;
		font-size: 5.5px;
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

	.group-name {
		font-size: 0.75rem;
		font-weight: 700;
		color: #f4f4f5;
		margin: 0 0 0.625rem;
	}

	.progression-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.progression-item {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		padding-left: 0.75rem;
		border-left: 2px solid rgba(99, 102, 241, 0.4);
	}

	.progression-name {
		font-size: 0.6875rem;
		color: #d4d4d8;
	}

	.progression-chords {
		font-size: 0.625rem;
		color: #71717a;
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
		z-index: 2;
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
