<script lang="ts">
	import {
		getChordProgressionIssues,
		getChordMatchingChallenges
	} from "$data/hand-reviewed-songs.js";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import SongTooltip from "../../shared/SongTooltip.svelte";
	import {
		EXPLAINED_THRESHOLD_PERCENT,
		HIGH_COVERAGE_THRESHOLD_PERCENT,
		CHART_DOT_FILL,
		CHART_DOT_HOVER_FILL
	} from "../constants.js";
	import {
		beeswarmChartHeight,
		dodgeBeeswarm
	} from "../../shared/charts/dodgeBeeswarm.js";
	import {
		HOVER_CARD_WIDTH,
		hoverCardStyle
	} from "../../shared/hoverCardPosition.js";

	type SongEntry = {
		songKey: string;
		title: string;
		artists: string[];
		coveragePercent: number;
		matchingProgressions: string[];
		chordProgressionIssues?: string;
		chordMatchingChallenges?: string;
	};

	type DodgedNode = SongEntry & { x: number; y: number };

	type Props = {
		songs: SongEntry[] | null;
		songByKey: ReadonlyMap<string, GroupedSong>;
		selectedSongKey: string;
		highlightedProgressions?: string[] | null;
		highlightedProgression?: string | null;
		tooltipMatchingProgressions?: readonly string[] | null;
		onSelectSong?: (key: string) => void;
	};

	let {
		songs,
		songByKey,
		selectedSongKey,
		highlightedProgressions = null,
		highlightedProgression = null,
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
	const TICK_VALUES = [0, 25, 50, 75, 100];
	const TOOLTIP_EDGE_MARGIN = 16;
	const ISSUES_DOT_FILL = "rgba(239, 68, 68, 0.65)";
	const ISSUES_DOT_HOVER_FILL = "rgba(239, 68, 68, 0.95)";
	const TRICKY_DOT_FILL = "rgba(251, 191, 36, 0.65)";
	const TRICKY_DOT_HOVER_FILL = "rgba(251, 191, 36, 0.95)";

	const plotWidth = $derived(
		Math.max(0, containerWidth - PADDING_LEFT - PADDING_RIGHT)
	);

	const xScale = $derived(
		(pct: number) => PADDING_LEFT + (pct / 100) * plotWidth
	);

	const isHighlighted = (song: SongEntry): boolean =>
		activeHighlightProgressions !== null &&
		song.matchingProgressions.some((p) => activeHighlightProgressions!.includes(p));

	const dodgedNodes = $derived.by((): DodgedNode[] => {
		if (plotWidth <= 0 || songs === null) return [];

		const annotated = songs.map((s) => ({
			...s,
			chordProgressionIssues: getChordProgressionIssues(s.songKey),
			chordMatchingChallenges: getChordMatchingChallenges(s.songKey)
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
			(song) => xScale(song.coveragePercent),
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

	const ANNOTATION_LINE_Y_TOP = 8;

	type ChartAnnotation = {
		x: number;
		label: string;
		textAnchor: "start" | "end";
		textOffsetX: number;
	};

	const chartAnnotations = $derived.by((): ChartAnnotation[] => {
		if (!songs || songs.length === 0) return [];
		const total = songs.length;
		const aboveThreshold = Math.round(
			(songs.filter((s) => s.coveragePercent >= EXPLAINED_THRESHOLD_PERCENT)
				.length /
				total) *
				100
		);
		const aboveHighCoverage = Math.round(
			(songs.filter((s) => s.coveragePercent >= HIGH_COVERAGE_THRESHOLD_PERCENT)
				.length /
				total) *
				100
		);
		const atZero = Math.round(
			(songs.filter((s) => s.coveragePercent === 0).length / total) * 100
		);
		return [
			{
				x: xScale(0),
				label: `${atZero}% of songs have 0% coverage`,
				textAnchor: "start",
				textOffsetX: 6
			},
			{
				x: xScale(EXPLAINED_THRESHOLD_PERCENT),
				label: `${aboveThreshold}% of songs above ${EXPLAINED_THRESHOLD_PERCENT}% coverage`,
				textAnchor: "end",
				textOffsetX: -6
			},
			{
				x: xScale(HIGH_COVERAGE_THRESHOLD_PERCENT),
				label: `${aboveHighCoverage}% above ${HIGH_COVERAGE_THRESHOLD_PERCENT}%`,
				textAnchor: "end",
				textOffsetX: -6
			}
		];
	});

	const dotFillFor = (node: DodgedNode, isHovered: boolean): string => {
		const hasIssues = node.chordProgressionIssues !== undefined;
		const isTricky = node.chordMatchingChallenges !== undefined;
		if (hasIssues) return isHovered ? ISSUES_DOT_HOVER_FILL : ISSUES_DOT_FILL;
		if (isTricky) return isHovered ? TRICKY_DOT_HOVER_FILL : TRICKY_DOT_FILL;
		return isHovered ? CHART_DOT_HOVER_FILL : CHART_DOT_FILL;
	};

	function selectSong(songKey: string) {
		hoveredSongKey = null;
		onSelectSong?.(songKey);
	}
</script>

<div class="beeswarm" bind:clientWidth={containerWidth}>
	{#if songs === null}
		<div class="loading-shell" style:height={LOADING_HEIGHT + "px"}>
			<span class="loading-text">Computing coverage…</span>
		</div>
	{:else if containerWidth > 0 && songs.length > 0}
		<svg width={containerWidth} height={chartHeight}>
			<line
				x1={PADDING_LEFT}
				x2={PADDING_LEFT + plotWidth}
				y1={AXIS_Y}
				y2={AXIS_Y}
				class="axis-line"
			/>
			{#each chartAnnotations as annotation}
				<line
					x1={annotation.x}
					x2={annotation.x}
					y1={ANNOTATION_LINE_Y_TOP}
					y2={AXIS_Y}
					class="threshold-line"
				/>
				<text
					x={annotation.x + annotation.textOffsetX}
					y={ANNOTATION_LINE_Y_TOP + 9}
					text-anchor={annotation.textAnchor}
					class="threshold-label">{annotation.label}</text
				>
			{/each}
			{#each TICK_VALUES as tick}
				{@const tx = xScale(tick)}
				<line x1={tx} x2={tx} y1={AXIS_Y} y2={AXIS_Y + 5} class="tick-mark" />
				<text x={tx} y={AXIS_Y + 16} text-anchor="middle" class="tick-label"
					>{tick}%</text
				>
			{/each}
		{#each [false, true] as renderHighlighted}
			{#each dodgedNodes.filter((n) => isHighlighted(n) === renderHighlighted) as node}
				{@const isSelected = node.songKey === selectedSongKey}
				{@const isHovered = node.songKey === hoveredSongKey}
				{@const hasIssues = node.chordProgressionIssues !== undefined}
				{@const isTricky = node.chordMatchingChallenges !== undefined}
				{@const isDimmed = activeHighlightProgressions !== null && !isHighlighted(node)}
				{@const r = isSelected ? SELECTED_DOT_RADIUS : DOT_RADIUS}
				{@const cy = AXIS_Y - DOT_RADIUS - node.y}
				<circle
					cx={node.x}
					{cy}
					{r}
					fill={dotFillFor(node, isHovered)}
					class="dot"
					class:selected={isSelected}
					class:dimmed={isDimmed}
					class:hovered={isHovered}
					class:has-issues={hasIssues}
					class:tricky={isTricky && !hasIssues}
					onmouseenter={() => (hoveredSongKey = node.songKey)}
					onmouseleave={() => (hoveredSongKey = null)}
					onclick={() => selectSong(node.songKey)}
					onkeydown={(e) => {
						if (e.key === "Enter" || e.key === " ") selectSong(node.songKey);
					}}
					role="button"
					tabindex={0}
					aria-label="{node.title} — {Math.round(
						node.coveragePercent
					)}% explained"
				/>
			{/each}
		{/each}
		</svg>

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

	svg {
		display: block;
		overflow: visible;
	}

	.threshold-line {
		stroke: rgba(255, 255, 255, 0.2);
		stroke-width: 1;
		stroke-dasharray: 4 3;
	}

	.threshold-label {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.6rem;
		fill: rgba(161, 161, 170, 0.55);
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

	.dot:focus-visible {
		stroke: rgba(255, 255, 255, 0.8);
		stroke-width: 2px;
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

	.dot.has-issues.hovered {
		stroke: rgba(255, 255, 255, 0.6);
		stroke-width: 1.5px;
	}

	.dot.tricky.hovered {
		stroke: rgba(255, 255, 255, 0.6);
		stroke-width: 1.5px;
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
