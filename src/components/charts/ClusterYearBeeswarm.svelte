<script lang="ts">
	// A cluster's songs over time: one dot per song, stacked by release
	// year (adapted from ArtistSongTimeline). Optionally labels some songs,
	// rings a highlighted one, and reports hovers (with onHoverSong set);
	// otherwise it's display only, e.g. in a tooltip that can't be hovered.
	import { scaleLinear } from "d3";
	import {
		beeswarmChartHeight,
		dodgeBeeswarm,
		tallestStackHeight,
		type DodgedPoint
	} from "$routes/demo/shared/charts/dodgeBeeswarm.js";
	import { toCalendarYear } from "$data/songYear.js";
	import type {
		BeeswarmAnnotation,
		BeeswarmSong,
		YearDomain
	} from "./beeswarmSongs.js";

	// Dots shrink through these radii until the tallest stack fits its cap.
	const DOT_RADII = [3, 2.75, 2.5, 2.25, 2, 1.75, 1.5, 1.25, 1];
	// The cap grows with the song count (by square root) from MIN for an
	// empty chart to MAX for one with maxSongCount songs, so small clusters
	// read as short charts and big ones as tall, even as dots shrink to fit.
	const MIN_STACK_HEIGHT = 16;
	const MAX_STACK_HEIGHT = 90;
	const DOT_SPACING = 0.5;
	const PADDING_X = 4;
	const TOP_PADDING = 4;
	const AXIS_HEIGHT = 18;
	const YEAR_PADDING = 0.5;
	const TICK_COUNT = 6;
	// Annotation labels sit in rows above the dots, as few as fit.
	const LABEL_FONT_SIZE = 10;
	const LABEL_ROW_HEIGHT = 13;
	const LABEL_GAP = 8;
	const LABEL_MAX_CHARS = 28;
	// The hovered song's title, in a row reserved above everything.
	const CAPTION_HEIGHT = 16;
	// How far from a dot the pointer can be and still hover it.
	const HOVER_PICK_RADIUS = 8;
	const RING_GAP = 1.5;

	let {
		songs,
		yearDomain,
		maxSongCount,
		annotations = [],
		highlightedSongKey = null,
		linkedSongKey = null,
		selectedSongKey = null,
		onHoverSong = null
	}: {
		songs: readonly BeeswarmSong[];
		// Shared by every chart, so their timelines line up.
		yearDomain: YearDomain;
		// The most songs any chart shown alongside this one has, which gets
		// the full MAX_STACK_HEIGHT.
		maxSongCount: number;
		annotations?: readonly BeeswarmAnnotation[];
		// Ringed, with its label emphasized and the other labels faded, e.g.
		// the song playing.
		highlightedSongKey?: string | null;
		// Ringed, e.g. a song hovered on the map beside the chart.
		linkedSongKey?: string | null;
		// Ringed (without the label emphasis of highlightedSongKey), e.g. a
		// song without a sample that was clicked on the map.
		selectedSongKey?: string | null;
		// Turns on hovering; called with the hovered song, or null.
		onHoverSong?: ((songKey: string | null) => void) | null;
	} = $props();

	let width = $state(0);
	let containerEl = $state<HTMLDivElement | null>(null);
	let hoveredSongKey = $state<string | null>(null);

	const xScale = $derived(
		scaleLinear()
			.domain([yearDomain.min - YEAR_PADDING, yearDomain.max + YEAR_PADDING])
			.range([PADDING_X, Math.max(PADDING_X, width - PADDING_X)])
	);

	const ticks = $derived(
		xScale
			.ticks(TICK_COUNT)
			.filter((tick) => Number.isInteger(tick))
			.map((tick) => ({ year: tick, x: xScale(tick) }))
	);

	const stackHeightCap = $derived(
		MIN_STACK_HEIGHT +
			(MAX_STACK_HEIGHT - MIN_STACK_HEIGHT) *
				Math.sqrt(Math.min(1, songs.length / Math.max(1, maxSongCount)))
	);

	const layout = $derived.by(() => {
		let radius = DOT_RADII[0];
		let nodes: DodgedPoint<BeeswarmSong>[] = [];
		if (width <= 0) return { radius, nodes };
		for (radius of DOT_RADII) {
			nodes = dodgeBeeswarm(
				songs,
				(song) => xScale(song.year),
				radius,
				DOT_SPACING
			);
			if (tallestStackHeight(nodes) + radius * 2 <= stackHeightCap) break;
		}
		return { radius, nodes };
	});

	const nodeBySongKey = $derived(
		new Map(layout.nodes.map((node) => [node.item.songKey, node]))
	);

	const truncate = (text: string) =>
		text.length > LABEL_MAX_CHARS
			? `${text.slice(0, LABEL_MAX_CHARS - 1).trimEnd()}…`
			: text;

	// Label widths, measured in the chart's own font.
	const measureContext =
		typeof document === "undefined"
			? null
			: document.createElement("canvas").getContext("2d");
	const labelWidth = (text: string): number => {
		if (!measureContext || !containerEl) return text.length * 6;
		const { fontFamily } = getComputedStyle(containerEl);
		measureContext.font = `${LABEL_FONT_SIZE}px ${fontFamily}`;
		return measureContext.measureText(text).width;
	};

	// Each annotation centered over its dot (kept inside the chart), in the
	// first row where it doesn't run into the label before it.
	const placedLabels = $derived.by(() => {
		const rowEnds: number[] = [];
		return annotations
			.flatMap(({ songKey, label }) => {
				const node = nodeBySongKey.get(songKey);
				return node ? [{ songKey, text: truncate(label), node }] : [];
			})
			.sort((a, b) => a.node.x - b.node.x)
			.map((label) => {
				const textWidth = labelWidth(label.text);
				const x = Math.min(
					Math.max(label.node.x, textWidth / 2),
					width - textWidth / 2
				);
				let row = rowEnds.findIndex(
					(end) => end + LABEL_GAP <= x - textWidth / 2
				);
				if (row === -1) row = rowEnds.length;
				rowEnds[row] = x + textWidth / 2;
				return { ...label, x, row };
			});
	});

	const labelRowCount = $derived(
		placedLabels.length === 0
			? 0
			: Math.max(...placedLabels.map((label) => label.row)) + 1
	);

	const captionHeight = $derived(onHoverSong ? CAPTION_HEIGHT : 0);
	const labelsTop = $derived(captionHeight + TOP_PADDING);
	const labelsHeight = $derived(labelRowCount * LABEL_ROW_HEIGHT);

	const chartHeight = $derived(
		captionHeight +
			labelsHeight +
			beeswarmChartHeight(layout.nodes, TOP_PADDING, layout.radius, AXIS_HEIGHT)
	);

	const axisY = $derived(chartHeight - AXIS_HEIGHT);
	const dotY = (node: DodgedPoint<BeeswarmSong>) =>
		axisY - layout.radius - node.y;

	const hoveredNode = $derived(
		hoveredSongKey === null ? null : (nodeBySongKey.get(hoveredSongKey) ?? null)
	);

	const emphasizing = $derived(
		highlightedSongKey !== null && nodeBySongKey.has(highlightedSongKey)
	);

	const ringedNodes = $derived(
		[
			...new Set([
				highlightedSongKey,
				selectedSongKey,
				hoveredSongKey,
				linkedSongKey
			])
		].flatMap((songKey) => {
			const node = songKey === null ? undefined : nodeBySongKey.get(songKey);
			return node ? [node] : [];
		})
	);

	const setHovered = (songKey: string | null) => {
		if (songKey === hoveredSongKey) return;
		hoveredSongKey = songKey;
		onHoverSong?.(songKey);
	};

	const handlePointerMove = (event: PointerEvent) => {
		const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
		let nearest: string | null = null;
		let nearestDistance = (HOVER_PICK_RADIUS + layout.radius) ** 2;
		for (const node of layout.nodes) {
			const distance = (node.x - x) ** 2 + (dotY(node) - y) ** 2;
			if (distance < nearestDistance) {
				nearest = node.item.songKey;
				nearestDistance = distance;
			}
		}
		setHovered(nearest);
	};

	$effect(() => () => {
		if (hoveredSongKey !== null) onHoverSong?.(null);
	});
</script>

<div class="beeswarm" bind:clientWidth={width} bind:this={containerEl}>
	{#if width > 0}
		<!-- hovering only mirrors the song on the map; nothing to activate -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<svg
			{width}
			height={chartHeight}
			aria-hidden="true"
			class:hoverable={onHoverSong !== null}
			class:emphasizing
			onpointermove={onHoverSong ? handlePointerMove : undefined}
			onpointerleave={onHoverSong ? () => setHovered(null) : undefined}
		>
			{#if hoveredNode}
				<text x={PADDING_X} y={CAPTION_HEIGHT - 4} class="caption">
					{hoveredNode.item.title ?? ""}
					<tspan class="caption-year">
						{toCalendarYear(hoveredNode.item.year)}
					</tspan>
				</text>
			{/if}
			<line
				x1={PADDING_X}
				x2={width - PADDING_X}
				y1={axisY}
				y2={axisY}
				class="axis-line"
			/>
			{#each ticks as tick (tick.year)}
				<line
					x1={tick.x}
					x2={tick.x}
					y1={axisY}
					y2={axisY + 3}
					class="tick-mark"
				/>
				<text x={tick.x} y={axisY + 13} text-anchor="middle" class="tick-label">
					{tick.year}
				</text>
			{/each}
			{#each placedLabels as label (label.songKey)}
				{@const labelY = labelsTop + label.row * LABEL_ROW_HEIGHT}
				<line
					x1={label.node.x}
					x2={label.node.x}
					y1={labelY + LABEL_FONT_SIZE + 2}
					y2={dotY(label.node) - layout.radius - RING_GAP}
					class="leader"
					class:highlighted={label.songKey === highlightedSongKey}
				/>
				<text
					x={label.x}
					y={labelY + LABEL_FONT_SIZE}
					text-anchor="middle"
					class="label"
					class:highlighted={label.songKey === highlightedSongKey}
					style:font-size="{LABEL_FONT_SIZE}px"
				>
					{label.text}
				</text>
			{/each}
			{#each layout.nodes as node (node.item.songKey)}
				<circle
					cx={node.x}
					cy={dotY(node)}
					r={layout.radius}
					fill={node.item.color}
					class="dot"
					class:highlighted={node.item.songKey === highlightedSongKey}
				/>
			{/each}
			{#each ringedNodes as node (node.item.songKey)}
				<circle
					cx={node.x}
					cy={dotY(node)}
					r={layout.radius + RING_GAP}
					class="ring"
				/>
			{/each}
		</svg>
	{/if}
</div>

<style>
	.beeswarm {
		width: 100%;
		margin-top: 0.5rem;
	}

	svg {
		display: block;
		overflow: visible;
	}

	svg.hoverable {
		cursor: crosshair;
	}

	.axis-line {
		stroke: rgba(255, 255, 255, 0.15);
		stroke-width: 1;
	}

	.tick-mark {
		stroke: rgba(255, 255, 255, 0.25);
		stroke-width: 1;
	}

	.tick-label {
		font-size: 0.55rem;
		fill: rgba(212, 212, 216, 0.85);
	}

	.leader,
	.label {
		transition:
			opacity 200ms ease,
			stroke-width 200ms ease;
	}

	.leader {
		stroke: rgba(255, 255, 255, 0.35);
		stroke-width: 1;
	}

	/* Atlas Typewriter only comes in medium; Atlas Grotesk has a regular. */
	.label {
		font-family: var(--font-sans);
		font-weight: 400;
		fill: rgba(244, 244, 245, 0.75);
	}

	.label.highlighted {
		fill: #fff;
		font-weight: 700;
	}

	/* While a song is highlighted, everything else steps back. */
	.emphasizing .leader:not(.highlighted) {
		stroke-width: 0.5;
		opacity: 0.4;
	}

	.emphasizing .label:not(.highlighted) {
		opacity: 0.5;
	}

	.emphasizing .leader.highlighted {
		stroke: rgba(255, 255, 255, 0.8);
	}

	.ring {
		fill: none;
		stroke: #fff;
		stroke-width: 1.5;
	}

	.caption {
		font-size: 0.7rem;
		fill: #f4f4f5;
	}

	.caption-year {
		fill: rgba(161, 161, 170, 0.8);
	}
</style>
