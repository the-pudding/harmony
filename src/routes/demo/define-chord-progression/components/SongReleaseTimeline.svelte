<script lang="ts">
	import { scaleLinear } from "d3";
	import {
		getChordProgressionIssues,
		isSongLooksGoodAsIs,
		LOOKS_GOOD_EMOJI,
		LOOKS_GOOD_LABEL,
		getChordMatchingChallenges,
		CHORD_MATCHING_CHALLENGES_LABEL
	} from "$data/hand-reviewed-songs.js";
	import ChordProgressionIssuesNote from "./ChordProgressionIssuesNote.svelte";
	import {
		beeswarmChartHeight,
		dodgeBeeswarm
	} from "../../shared/charts/dodgeBeeswarm.js";
	import { toCalendarYear } from "../../../../data/songYear.js";

	type SongEntry = {
		songKey: string;
		title: string;
		artists: string[];
		year: number | null;
		coveragePercent: number;
		matchingProgressions: string[];
	};

	type AnnotatedSong = SongEntry & {
		year: number;
		chordProgressionIssues?: string;
		chordMatchingChallenges?: string;
		looksGoodAsIs?: boolean;
	};

	type DodgedNode = AnnotatedSong & { x: number; y: number };

	type YearDomain = { min: number; max: number };

	type Props = {
		songs: SongEntry[] | null;
		selectedSongKey: string;
		highlightedProgressions?: string[] | null;
		highlightedProgression?: string | null;
		yearDomain?: YearDomain | null;
		onSelectSong?: (key: string) => void;
	};

	let {
		songs,
		selectedSongKey,
		highlightedProgressions = null,
		highlightedProgression = null,
		yearDomain = null,
		onSelectSong
	}: Props = $props();

	const activeHighlightProgressions = $derived(
		highlightedProgressions ??
			(highlightedProgression !== null ? [highlightedProgression] : null)
	);

	let containerWidth = $state(0);
	let hoveredSongKey = $state<string | null>(null);
	let clearHoverTimeout: ReturnType<typeof setTimeout> | null = null;

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
	const TOOLTIP_WIDTH = 200;
	const TOOLTIP_EDGE_MARGIN = 4;
	const TOOLTIP_VERTICAL_GAP = 6;
	const TICK_MARK_LENGTH = 5;
	const TICK_LABEL_OFFSET_Y = 16;
	const HOVER_CLEAR_DELAY_MS = 120;

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

	const dodgedNodes = $derived.by((): DodgedNode[] => {
		if (plotWidth <= 0 || songs === null || effectiveDomain === null) return [];

		const annotated: AnnotatedSong[] = datedSongs.map((song) => ({
			...song,
			chordProgressionIssues: getChordProgressionIssues(song.songKey),
			chordMatchingChallenges: getChordMatchingChallenges(song.songKey),
			looksGoodAsIs: isSongLooksGoodAsIs(song.songKey)
		}));

		return dodgeBeeswarm(
			annotated,
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

	const tooltipLeft = $derived.by(() => {
		if (!hoveredNode) return 0;
		return Math.max(
			TOOLTIP_EDGE_MARGIN,
			Math.min(
				containerWidth - TOOLTIP_WIDTH - TOOLTIP_EDGE_MARGIN,
				hoveredNode.x - TOOLTIP_WIDTH / 2
			)
		);
	});

	const tooltipTopY = $derived(
		hoveredNode ? AXIS_Y - DOT_RADIUS - hoveredNode.y : 0
	);

	function handleDotEnter(songKey: string) {
		if (clearHoverTimeout !== null) {
			clearTimeout(clearHoverTimeout);
			clearHoverTimeout = null;
		}
		hoveredSongKey = songKey;
	}

	function scheduleHoverClear() {
		clearHoverTimeout = setTimeout(() => {
			hoveredSongKey = null;
			clearHoverTimeout = null;
		}, HOVER_CLEAR_DELAY_MS);
	}

	function cancelHoverClear() {
		if (clearHoverTimeout !== null) {
			clearTimeout(clearHoverTimeout);
			clearHoverTimeout = null;
		}
	}

	function selectSong(songKey: string) {
		cancelHoverClear();
		hoveredSongKey = null;
		onSelectSong?.(songKey);
	}
</script>

<div class="beeswarm" bind:clientWidth={containerWidth}>
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
			{#each dodgedNodes as node (node.songKey)}
				{@const isSelected = node.songKey === selectedSongKey}
				{@const isHovered = node.songKey === hoveredSongKey}
				{@const hasIssues = node.chordProgressionIssues !== undefined}
				{@const isTricky = node.chordMatchingChallenges !== undefined}
				{@const isCoreMatched =
					activeHighlightProgressions !== null &&
					node.matchingProgressions.some((progression) =>
						activeHighlightProgressions.includes(progression)
					)}
				{@const r = isSelected ? SELECTED_DOT_RADIUS : DOT_RADIUS}
				{@const cy = AXIS_Y - DOT_RADIUS - node.y}
				<circle
					cx={node.x}
					{cy}
					{r}
					class="dot"
					class:selected={isSelected}
					class:core-matched={isCoreMatched}
					class:hovered={isHovered}
					class:has-issues={hasIssues && !isCoreMatched}
					class:tricky={isTricky && !hasIssues && !isCoreMatched}
					class:looks-good={node.looksGoodAsIs && !hasIssues && !isTricky && !isCoreMatched}
					onmouseenter={() => handleDotEnter(node.songKey)}
					onmouseleave={scheduleHoverClear}
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
		</svg>

		{#if undatedCount > 0}
			<p class="undated">{undatedCount} songs without a release year</p>
		{/if}

		{#if hoveredNode}
			<div
				class="tooltip"
				style:left={tooltipLeft + "px"}
				style:top={tooltipTopY - DOT_RADIUS - TOOLTIP_VERTICAL_GAP + "px"}
				style:width={TOOLTIP_WIDTH + "px"}
				style:transform="translateY(-100%)"
				onmouseenter={cancelHoverClear}
				onmouseleave={scheduleHoverClear}
				role="none"
			>
				<button
					class="song-card"
					onclick={() => selectSong(hoveredNode.songKey)}
				>
					<span class="song-title">{hoveredNode.title}</span>
					<span class="song-artists">{hoveredNode.artists.join(", ")}</span>
					<span class="song-stats"
						>{toCalendarYear(hoveredNode.year)} · {Math.round(hoveredNode.coveragePercent)}%
						chord coverage</span
					>
					<ChordProgressionIssuesNote
						songKey={hoveredNode.songKey}
						size="sm"
						inline
						brightensOnParentHover
					/>
					{#if hoveredNode.chordMatchingChallenges}
						<ChordProgressionIssuesNote
							songKey={hoveredNode.songKey}
							size="sm"
							inline
							brightensOnParentHover
							overrideText={hoveredNode.chordMatchingChallenges}
							overrideLabel={CHORD_MATCHING_CHALLENGES_LABEL}
							overrideColor="rgba(251, 191, 36, 0.9)"
							overrideColorHover="rgba(253, 224, 71, 0.95)"
						/>
					{/if}
					{#if hoveredNode.looksGoodAsIs}
						<span class="looks-good-note"
							>{LOOKS_GOOD_EMOJI} {LOOKS_GOOD_LABEL}</span
						>
					{/if}
					<div class="coverage-bar" aria-hidden="true">
						<div
							class="coverage-fill"
							style:width={Math.min(hoveredNode.coveragePercent, 100) + "%"}
						></div>
					</div>
				</button>
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
		fill: rgba(99, 102, 241, 0.55);
		cursor: pointer;
		outline: none;
		transition: fill 0.1s ease;
	}

	.dot:focus-visible {
		stroke: rgba(255, 255, 255, 0.8);
		stroke-width: 2px;
	}

	.dot.hovered {
		fill: rgba(99, 102, 241, 0.9);
		stroke: rgba(255, 255, 255, 0.6);
		stroke-width: 1.5px;
	}

	.dot.core-matched {
		fill: rgba(21, 128, 61, 0.85);
		stroke: rgba(134, 239, 172, 0.7);
		stroke-width: 1px;
	}

	.dot.core-matched.hovered {
		fill: rgba(21, 128, 61, 1);
		stroke: rgba(134, 239, 172, 0.95);
		stroke-width: 1.5px;
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

	.dot.looks-good {
		fill: rgba(96, 165, 250, 0.65);
	}

	.dot.looks-good.hovered {
		fill: rgba(96, 165, 250, 0.95);
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
		z-index: 10;
	}

	.song-card {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.125rem;
		width: 100%;
		box-sizing: border-box;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.375rem;
		color: #a1a1aa;
		padding: 0.375rem 0.625rem;
		cursor: pointer;
		text-align: left;
		overflow-wrap: anywhere;
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
	}

	.song-card:hover {
		background: rgba(255, 255, 255, 0.09);
		border-color: rgba(255, 255, 255, 0.2);
		color: #e4e4e7;
	}

	.song-title {
		font-size: 0.75rem;
		color: inherit;
	}

	.song-artists {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		font-size: 0.65rem;
		color: rgba(161, 161, 170, 0.7);
	}

	.song-card:hover .song-artists {
		color: rgba(228, 228, 231, 0.7);
	}

	.song-stats {
		font-size: 0.65rem;
		color: rgba(161, 161, 170, 0.85);
	}

	.song-card:hover .song-stats {
		color: rgba(228, 228, 231, 0.85);
	}

	.looks-good-note {
		font-size: 0.65rem;
		font-style: italic;
		line-height: 1.4;
		color: rgba(96, 165, 250, 0.9);
	}

	.song-card:hover .looks-good-note {
		color: rgba(147, 197, 253, 0.95);
	}

	.coverage-bar {
		width: 100%;
		height: 0.25rem;
		margin-top: 0.125rem;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.08);
		overflow: hidden;
	}

	.coverage-fill {
		height: 100%;
		border-radius: inherit;
		background: rgba(161, 161, 170, 0.75);
		transition: width 0.2s ease;
	}

	.song-card:hover .coverage-fill {
		background: rgba(228, 228, 231, 0.75);
	}
</style>
