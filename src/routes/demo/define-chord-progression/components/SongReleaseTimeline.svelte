<script lang="ts">
	import { scaleLinear } from "d3";
	import { colorForProgressionGroupName } from "$data/core-progressions.js";
	import {
		getChordProgressionIssues,
		getChordMatchingChallenges
	} from "$data/hand-reviewed-songs.js";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import SongTooltip from "../../shared/SongTooltip.svelte";
	import {
		CHART_DOT_FILL,
		CHART_DOT_HOVER_FILL
	} from "../constants.js";
	import {
		beeswarmChartHeight,
		dodgeBeeswarm
	} from "../../shared/charts/dodgeBeeswarm.js";
	import { toCalendarYear } from "../../../../data/songYear.js";
	import {
		HOVER_CARD_WIDTH,
		hoverCardStyle
	} from "../../shared/hoverCardPosition.js";

	type SongEntry = {
		songKey: string;
		title: string;
		artists: string[];
		year: number | null;
		coveragePercent: number;
		matchingProgressions: string[];
		dominantGroupName?: string | null;
	};

	type AnnotatedSong = SongEntry & {
		year: number;
		chordProgressionIssues?: string;
		chordMatchingChallenges?: string;
	};

	type DodgedNode = AnnotatedSong & { x: number; y: number };

	type YearDomain = { min: number; max: number };

	type Props = {
		songs: SongEntry[] | null;
		songByKey: ReadonlyMap<string, GroupedSong>;
		selectedSongKey: string;
		highlightedProgressions?: string[] | null;
		highlightedProgression?: string | null;
		yearDomain?: YearDomain | null;
		colorByProgressionGroup?: boolean;
		tooltipMatchingProgressions?: readonly string[] | null;
		onSelectSong?: (key: string) => void;
	};

	let {
		songs,
		songByKey,
		selectedSongKey,
		highlightedProgressions = null,
		highlightedProgression = null,
		yearDomain = null,
		colorByProgressionGroup = false,
		tooltipMatchingProgressions = null,
		onSelectSong
	}: Props = $props();

	const activeHighlightProgressions = $derived(
		highlightedProgressions ??
			(highlightedProgression !== null ? [highlightedProgression] : null)
	);

	let containerWidth = $state(0);
	let hoveredSongKey = $state<string | null>(null);

	const DOT_RADIUS = 2.5;
	const SELECTED_DOT_RADIUS = 4.5;
	const DOT_SPACING = 0.1;
	const PADDING_LEFT = 28;
	const PADDING_RIGHT = 28;
	const AXIS_HEIGHT = 28;
	const TOP_PADDING = 24;
	const LOADING_HEIGHT = 120;
	const EMPTY_HEIGHT = 48;
	const YEAR_PADDING = 0.5;
	const TICK_COUNT = 8;
	const TOOLTIP_EDGE_MARGIN = 16;
	const TICK_MARK_LENGTH = 5;
	const TICK_LABEL_OFFSET_Y = 16;
	const ISSUES_DOT_FILL = "rgba(239, 68, 68, 0.65)";
	const ISSUES_DOT_HOVER_FILL = "rgba(239, 68, 68, 0.95)";
	const TRICKY_DOT_FILL = "rgba(251, 191, 36, 0.65)";
	const TRICKY_DOT_HOVER_FILL = "rgba(251, 191, 36, 0.95)";

	const datedSongs = $derived(
		(songs ?? []).filter(
			(song): song is SongEntry & { year: number } => song.year !== null
		)
	);

	const undatedCount = $derived(
		songs === null ? 0 : songs.length - datedSongs.length
	);

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

	const isHighlighted = (song: SongEntry): boolean =>
		activeHighlightProgressions !== null &&
		song.matchingProgressions.some((p) => activeHighlightProgressions!.includes(p));

	const dodgedNodes = $derived.by((): DodgedNode[] => {
		if (plotWidth <= 0 || songs === null || effectiveDomain === null) return [];

		const annotated: AnnotatedSong[] = datedSongs.map((song) => ({
			...song,
			chordProgressionIssues: getChordProgressionIssues(song.songKey),
			chordMatchingChallenges: getChordMatchingChallenges(song.songKey)
		}));

		const sorted =
			activeHighlightProgressions !== null
				? [
						...annotated.filter(isHighlighted),
						...annotated.filter((s) => !isHighlighted(s))
					]
				: annotated;

		return dodgeBeeswarm(
			sorted,
			(song) => xScale(song.year),
			DOT_RADIUS,
			DOT_SPACING
		).map(({ item, x, y }) => ({ ...item, x, y }));
	});

	const chartHeight = $derived(
		beeswarmChartHeight(dodgedNodes, TOP_PADDING, DOT_RADIUS, AXIS_HEIGHT)
	);

	const AXIS_Y = $derived(chartHeight - AXIS_HEIGHT);

	const hoveredNode = $derived(
		hoveredSongKey !== null
			? (dodgedNodes.find((n) => n.songKey === hoveredSongKey) ?? null)
			: null
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
					{ x: hoveredNode.x, y: AXIS_Y - DOT_RADIUS - hoveredNode.y },
					containerWidth,
					tooltipWidth
				)
	);

	const dotFillFor = (node: DodgedNode, isHovered: boolean): string | null => {
		if (!colorByProgressionGroup) return null;
		const hasIssues = node.chordProgressionIssues !== undefined;
		const isTricky = node.chordMatchingChallenges !== undefined;
		if (hasIssues) return isHovered ? ISSUES_DOT_HOVER_FILL : ISSUES_DOT_FILL;
		if (isTricky) return isHovered ? TRICKY_DOT_HOVER_FILL : TRICKY_DOT_FILL;
		return colorForProgressionGroupName(node.dominantGroupName ?? null);
	};

	function selectSong(songKey: string) {
		hoveredSongKey = null;
		onSelectSong?.(songKey);
	}
</script>

<div
	class="beeswarm"
	style="--chart-dot-fill: {CHART_DOT_FILL}; --chart-dot-hover-fill: {CHART_DOT_HOVER_FILL};"
	bind:clientWidth={containerWidth}
>
	{#if songs === null}
		<div class="loading-shell" style:height={LOADING_HEIGHT + "px"}>
			<span class="loading-text">Computing coverage…</span>
		</div>
	{:else if datedSongs.length === 0}
		<div class="empty" style:height={EMPTY_HEIGHT + "px"}>
			No release years available for these songs.
		</div>
	{:else if containerWidth > 0}
		<svg width={containerWidth} height={chartHeight}>
			<line
				x1={PADDING_LEFT}
				x2={PADDING_LEFT + plotWidth}
				y1={AXIS_Y}
				y2={AXIS_Y}
				class="axis-line"
			/>
			{#each ticks as tick (tick.year)}
				<line
					x1={tick.x}
					x2={tick.x}
					y1={AXIS_Y}
					y2={AXIS_Y + TICK_MARK_LENGTH}
					class="tick-mark"
				/>
				<text
					x={tick.x}
					y={AXIS_Y + TICK_LABEL_OFFSET_Y}
					text-anchor="middle"
					class="tick-label">{tick.year}</text
				>
			{/each}
		{#each [false, true] as renderHighlighted (renderHighlighted)}
			{#each dodgedNodes.filter((n) => isHighlighted(n) === renderHighlighted) as node (node.songKey)}
				{@const isSelected = node.songKey === selectedSongKey}
				{@const isHovered = node.songKey === hoveredSongKey}
				{@const hasIssues = node.chordProgressionIssues !== undefined}
				{@const isTricky = node.chordMatchingChallenges !== undefined}
				{@const isDimmed = activeHighlightProgressions !== null && !isHighlighted(node)}
				{@const r = isSelected ? SELECTED_DOT_RADIUS : DOT_RADIUS}
				{@const cy = AXIS_Y - DOT_RADIUS - node.y}
				{@const dotFill = dotFillFor(node, isHovered)}
				<circle
					cx={node.x}
					{cy}
					{r}
					class="dot"
					class:selected={isSelected}
					class:dimmed={isDimmed}
					class:hovered={isHovered}
					class:color-by-group={colorByProgressionGroup}
					class:has-issues={hasIssues && !colorByProgressionGroup}
					class:tricky={isTricky && !hasIssues && !colorByProgressionGroup}
					fill={colorByProgressionGroup ? (dotFill ?? undefined) : undefined}
					onmouseenter={() => (hoveredSongKey = node.songKey)}
					onmouseleave={() => (hoveredSongKey = null)}
					onclick={() => selectSong(node.songKey)}
					onkeydown={(e) => {
						if (e.key === "Enter" || e.key === " ") selectSong(node.songKey);
					}}
					role="button"
					tabindex={0}
					aria-label="{node.title} ({toCalendarYear(node.year)}) — {Math.round(
						node.coveragePercent
					)}% explained"
				/>
			{/each}
		{/each}
		</svg>

		{#if undatedCount > 0}
			<p class="undated">{undatedCount} songs without a release year</p>
		{/if}

		{#if hoveredNode && hoveredSong}
			<div class="tooltip" style={tooltipStyle}>
				<SongTooltip
					song={hoveredSong}
					matchingProgressions={tooltipMatchingProgressions}
					explainedPercent={tooltipMatchingProgressions
						? hoveredNode.coveragePercent
						: undefined}
				/>
			</div>
		{/if}
	{/if}
</div>

<style>
	.beeswarm {
		position: relative;
		width: 100%;
	}

	.loading-shell {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
	}

	.loading-text {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.7rem;
		color: rgba(161, 161, 170, 0.5);
	}

	.empty {
		display: flex;
		align-items: center;
		font-size: 0.7rem;
		color: rgba(161, 161, 170, 0.5);
	}

	svg {
		display: block;
		overflow: visible;
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
		transition: fill 0.1s ease;
	}

	.dot:not(.color-by-group) {
		fill: var(--chart-dot-fill);
	}

	.dot:focus-visible {
		stroke: rgba(255, 255, 255, 0.8);
		stroke-width: 2px;
	}

	.dot.hovered:not(.color-by-group) {
		fill: var(--chart-dot-hover-fill);
	}

	.dot.hovered {
		stroke: rgba(255, 255, 255, 0.6);
		stroke-width: 1.5px;
	}

	.dot.dimmed {
		opacity: 0.35;
	}

	.dot.selected {
		stroke: rgba(255, 255, 255, 0.9);
		stroke-width: 1.5px;
	}

	.dot.has-issues {
		fill: rgba(239, 68, 68, 0.65);
	}

	.dot.has-issues.hovered {
		fill: rgba(239, 68, 68, 0.95);
		stroke: rgba(255, 255, 255, 0.6);
		stroke-width: 1.5px;
	}

	.dot.tricky {
		fill: rgba(251, 191, 36, 0.65);
	}

	.dot.tricky.hovered {
		fill: rgba(251, 191, 36, 0.95);
		stroke: rgba(255, 255, 255, 0.6);
		stroke-width: 1.5px;
	}

	.undated {
		margin: 0.25rem 0 0;
		font-size: 0.6rem;
		color: #52525b;
	}

	.tooltip {
		position: absolute;
		pointer-events: none;
		z-index: 10;
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
