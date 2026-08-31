<script lang="ts">
	import { scaleLinear } from "d3";
	import { colorForProgressionGroupName } from "$data/core-progressions.js";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import SongTooltip from "../SongTooltip.svelte";
	import { HOVER_CARD_WIDTH, hoverCardStyle } from "../hoverCardPosition.js";
	import {
		beeswarmChartHeight,
		dodgeBeeswarm
	} from "../charts/dodgeBeeswarm.js";
	import { toCalendarYear } from "../../../../data/songYear.js";
	import type { ArtistSongStat, YearDomain } from "./artistStats.js";

	const DOT_RADIUS = 3;
	const SELECTED_DOT_RADIUS = 5;
	const DOT_SPACING = 0.5;
	const PADDING_LEFT = 8;
	const PADDING_RIGHT = 8;
	const AXIS_HEIGHT = 22;
	const TOP_PADDING = 8;
	const EMPTY_HEIGHT = 48;
	const YEAR_PADDING = 0.5;
	const TICK_COUNT = 8;
	const DIMMED_OPACITY = 0.25;
	const TOOLTIP_EDGE_MARGIN = 16;

	type Props = {
		songs: ArtistSongStat[];
		songByKey: Map<string, GroupedSong>;
		yearDomain?: YearDomain | null;
		selectedSongKey?: string | null;
		highlightedProgressions?: string[] | null;
		onSelectSong: (songKey: string) => void;
	};

	const {
		songs,
		songByKey,
		yearDomain = null,
		selectedSongKey = null,
		highlightedProgressions = null,
		onSelectSong
	}: Props = $props();

	let containerWidth = $state(0);
	let hoveredSongKey = $state<string | null>(null);

	const datedSongs = $derived(
		songs.filter(
			(song): song is ArtistSongStat & { year: number } => song.year !== null
		)
	);

	const undatedCount = $derived(songs.length - datedSongs.length);

	const effectiveDomain = $derived.by((): YearDomain | null => {
		if (yearDomain) return yearDomain;
		if (datedSongs.length === 0) return null;
		const years = datedSongs.map((song) => song.year);
		return { min: Math.min(...years), max: Math.max(...years) };
	});

	const plotWidth = $derived(
		Math.max(0, containerWidth - PADDING_LEFT - PADDING_RIGHT)
	);

	const xScale = $derived(
		scaleLinear()
			.domain(
				effectiveDomain
					? [
							effectiveDomain.min - YEAR_PADDING,
							effectiveDomain.max + YEAR_PADDING
						]
					: [0, 1]
			)
			.range([PADDING_LEFT, PADDING_LEFT + plotWidth])
	);

	const ticks = $derived(
		effectiveDomain === null
			? []
			: xScale
					.ticks(TICK_COUNT)
					.filter((tick) => Number.isInteger(tick))
					.map((tick) => ({ year: tick, x: xScale(tick) }))
	);

	const dodgedNodes = $derived.by(() => {
		if (plotWidth <= 0 || effectiveDomain === null) return [];
		return dodgeBeeswarm(
			datedSongs,
			(song) => xScale(song.year),
			DOT_RADIUS,
			DOT_SPACING
		);
	});

	const chartHeight = $derived(
		beeswarmChartHeight(dodgedNodes, TOP_PADDING, DOT_RADIUS, AXIS_HEIGHT)
	);

	const axisY = $derived(chartHeight - AXIS_HEIGHT);

	const isHighlighted = (song: ArtistSongStat): boolean =>
		highlightedProgressions === null ||
		song.matchingProgressions.some((chordProgression) =>
			highlightedProgressions.includes(chordProgression)
		);

	const hoveredNode = $derived(
		hoveredSongKey === null
			? null
			: (dodgedNodes.find((node) => node.item.songKey === hoveredSongKey) ??
					null)
	);

	const hoveredSong = $derived(
		hoveredSongKey === null ? null : (songByKey.get(hoveredSongKey) ?? null)
	);

	const tooltipWidth = $derived(
		Math.min(
			HOVER_CARD_WIDTH,
			Math.max(0, containerWidth - TOOLTIP_EDGE_MARGIN)
		)
	);

	const tooltipStyle = $derived(
		hoveredNode === null
			? ""
			: hoverCardStyle(
					{ x: hoveredNode.x, y: axisY - DOT_RADIUS - hoveredNode.y },
					containerWidth,
					tooltipWidth
				)
	);
</script>

<div class="timeline" bind:clientWidth={containerWidth}>
	{#if datedSongs.length === 0}
		<div class="empty" style:height="{EMPTY_HEIGHT}px">
			No release years available for these songs.
		</div>
	{:else if containerWidth > 0}
		<svg width={containerWidth} height={chartHeight}>
			<line
				x1={PADDING_LEFT}
				x2={PADDING_LEFT + plotWidth}
				y1={axisY}
				y2={axisY}
				class="axis-line"
			/>
			{#each ticks as tick (tick.year)}
				<line
					x1={tick.x}
					x2={tick.x}
					y1={axisY}
					y2={axisY + 4}
					class="tick-mark"
				/>
				<text x={tick.x} y={axisY + 15} text-anchor="middle" class="tick-label"
					>{tick.year}</text
				>
			{/each}
			{#each dodgedNodes as node (node.item.songKey)}
				{@const song = node.item}
				{@const isSelected = song.songKey === selectedSongKey}
				{@const isHovered = song.songKey === hoveredSongKey}
				<circle
					cx={node.x}
					cy={axisY - DOT_RADIUS - node.y}
					r={isSelected || isHovered ? SELECTED_DOT_RADIUS : DOT_RADIUS}
					class="dot"
					class:selected={isSelected}
					class:hovered={isHovered}
					fill={colorForProgressionGroupName(song.groupName)}
					opacity={isHighlighted(song) ? 1 : DIMMED_OPACITY}
					role="button"
					tabindex={0}
					aria-label="{song.title} ({toCalendarYear(song.year)})"
					onmouseenter={() => (hoveredSongKey = song.songKey)}
					onmouseleave={() => (hoveredSongKey = null)}
					onfocus={() => (hoveredSongKey = song.songKey)}
					onblur={() => (hoveredSongKey = null)}
					onclick={() => onSelectSong(song.songKey)}
					onkeydown={(event) => {
						if (event.key === "Enter" || event.key === " ")
							onSelectSong(song.songKey);
					}}
				/>
			{/each}
		</svg>

		{#if undatedCount > 0}
			<p class="undated">{undatedCount} songs without a release year</p>
		{/if}

		{#if hoveredNode && hoveredSong}
			<div class="tooltip" style={tooltipStyle}>
				<SongTooltip song={hoveredSong} />
			</div>
		{/if}
	{/if}
</div>

<style>
	.timeline {
		position: relative;
		width: 100%;
	}

	svg {
		display: block;
		overflow: visible;
	}

	.empty {
		display: flex;
		align-items: center;
		font-size: 0.7rem;
		color: rgba(161, 161, 170, 0.5);
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
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.6rem;
		fill: rgba(161, 161, 170, 0.7);
	}

	.dot {
		cursor: pointer;
		outline: none;
		transition: r 0.1s ease;
	}

	.dot.hovered,
	.dot.selected {
		stroke: rgba(255, 255, 255, 0.85);
		stroke-width: 1.5px;
	}

	.dot:focus-visible {
		stroke: rgba(255, 255, 255, 0.9);
		stroke-width: 2px;
	}

	.undated {
		margin: 0.25rem 0 0;
		font-size: 0.6rem;
		color: #52525b;
	}

	.tooltip {
		position: absolute;
		pointer-events: none;
		z-index: 20;
		background: rgba(9, 9, 11, 0.96);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.5rem;
		padding: 0.875rem 1rem;
		backdrop-filter: blur(8px);
		overflow-y: auto;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.75rem;
		color: #f4f4f5;
	}
</style>
