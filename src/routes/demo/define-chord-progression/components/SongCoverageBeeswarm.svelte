<script lang="ts">
	import {
		getChordProgressionIssues
	} from "$data/hand-reviewed-songs.js";
	import ChordProgressionIssuesNote from "./ChordProgressionIssuesNote.svelte";
	import {
		EXPLAINED_THRESHOLD_PERCENT,
		HIGH_COVERAGE_THRESHOLD_PERCENT
	} from "../constants.js";

	type SongEntry = {
		songKey: string;
		title: string;
		artists: string[];
		coveragePercent: number;
		chordProgressionIssues?: string;
	};

	type DodgedNode = SongEntry & {
		x: number;
		y: number;
		next: DodgedNode | null;
	};

	type Props = {
		songs: SongEntry[] | null;
		selectedSongKey: string;
		onSelectSong?: (key: string) => void;
	};

	let { songs, selectedSongKey, onSelectSong }: Props = $props();

	let containerWidth = $state(0);
	let hoveredSongKey = $state<string | null>(null);
	let clearHoverTimeout: ReturnType<typeof setTimeout> | null = null;

	const DOT_RADIUS = 2.5;
	const SELECTED_DOT_RADIUS = 4.5;
	const DOT_SPACING = 0.1;
	const CHART_HEIGHT = 500;
	const PADDING_LEFT = 28;
	const PADDING_RIGHT = 28;
	const AXIS_HEIGHT = 28;
	const AXIS_Y = CHART_HEIGHT - AXIS_HEIGHT;
	const TICK_VALUES = [0, 25, 50, 75, 100];
	const TOOLTIP_WIDTH = 200;
	const HOVER_CLEAR_DELAY_MS = 120;

	const plotWidth = $derived(Math.max(0, containerWidth - PADDING_LEFT - PADDING_RIGHT));

	const xScale = $derived((pct: number) => PADDING_LEFT + (pct / 100) * plotWidth);

	const dodgedNodes = $derived.by(() => {
		if (plotWidth <= 0 || songs === null) return [] as DodgedNode[];

		const diameter = DOT_RADIUS * 2 + DOT_SPACING;
		const radius2 = diameter ** 2;
		const epsilon = 1e-3;

		const nodes: DodgedNode[] = songs
			.map((s) => ({
				...s,
				chordProgressionIssues: getChordProgressionIssues(s.songKey),
				x: xScale(s.coveragePercent),
				y: 0,
				next: null as DodgedNode | null
			}))
			.sort((a, b) => a.x - b.x);

		let head: DodgedNode | null = null;
		let tail: DodgedNode | null = null;

		function intersects(x: number, y: number): boolean {
			let a = head;
			while (a) {
				if (radius2 - epsilon > (a.x - x) ** 2 + (a.y - y) ** 2) return true;
				a = a.next;
			}
			return false;
		}

		for (const b of nodes) {
			while (head && head.x < b.x - radius2) head = head.next;

			if (intersects(b.x, 0)) {
				let a = head;
				b.y = Infinity;
				do {
					const candidateY = a!.y + Math.sqrt(radius2 - (a!.x - b.x) ** 2);
					if (candidateY < b.y && !intersects(b.x, candidateY)) b.y = candidateY;
					a = a!.next;
				} while (a);
			}

			b.next = null;
			if (!head) head = tail = b;
			else tail = tail!.next = b;
		}

		return nodes;
	});

	const hoveredNode = $derived(
		hoveredSongKey !== null
			? (dodgedNodes.find((n) => n.songKey === hoveredSongKey) ?? null)
			: null
	);

	const tooltipLeft = $derived.by(() => {
		if (!hoveredNode) return 0;
		return Math.max(4, Math.min(containerWidth - TOOLTIP_WIDTH - 4, hoveredNode.x - TOOLTIP_WIDTH / 2));
	});

	const tooltipTopY = $derived(hoveredNode ? AXIS_Y - DOT_RADIUS - hoveredNode.y : 0);

	const ANNOTATION_LINE_Y_TOP = 8;

	type ChartAnnotation = {
		x: number;
		label: string;
		textAnchor: 'start' | 'end';
		textOffsetX: number;
	};

	const chartAnnotations = $derived.by((): ChartAnnotation[] => {
		if (!songs || songs.length === 0) return [];
		const total = songs.length;
		const aboveThreshold = Math.round(
			(songs.filter((s) => s.coveragePercent >= EXPLAINED_THRESHOLD_PERCENT).length / total) * 100
		);
		const aboveHighCoverage = Math.round(
			(songs.filter((s) => s.coveragePercent >= HIGH_COVERAGE_THRESHOLD_PERCENT).length / total) *
				100
		);
		const atZero = Math.round(
			(songs.filter((s) => s.coveragePercent === 0).length / total) * 100
		);
		return [
			{
				x: xScale(0),
				label: `${atZero}% of songs have 0% coverage`,
				textAnchor: 'start',
				textOffsetX: 6
			},
			{
				x: xScale(EXPLAINED_THRESHOLD_PERCENT),
				label: `${aboveThreshold}% of songs above ${EXPLAINED_THRESHOLD_PERCENT}% coverage`,
				textAnchor: 'end',
				textOffsetX: -6
			},
			{
				x: xScale(HIGH_COVERAGE_THRESHOLD_PERCENT),
				label: `${aboveHighCoverage}% above ${HIGH_COVERAGE_THRESHOLD_PERCENT}%`,
				textAnchor: 'end',
				textOffsetX: -6
			}
		];
	});

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
		<div class="loading-shell" style:height={CHART_HEIGHT + 'px'}>
			<span class="loading-text">Computing coverage…</span>
		</div>
	{:else if containerWidth > 0 && songs.length > 0}
		<svg width={containerWidth} height={CHART_HEIGHT}>
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
					class="threshold-label"
				>{annotation.label}</text>
			{/each}
			{#each TICK_VALUES as tick}
				{@const tx = xScale(tick)}
				<line x1={tx} x2={tx} y1={AXIS_Y} y2={AXIS_Y + 5} class="tick-mark" />
				<text x={tx} y={AXIS_Y + 16} text-anchor="middle" class="tick-label">{tick}%</text>
			{/each}
			{#each dodgedNodes as node}
				{@const isSelected = node.songKey === selectedSongKey}
				{@const isHovered = node.songKey === hoveredSongKey}
				{@const hasIssues = node.chordProgressionIssues !== undefined}
				{@const r = isSelected ? SELECTED_DOT_RADIUS : DOT_RADIUS}
				{@const cy = AXIS_Y - DOT_RADIUS - node.y}
				<circle
					cx={node.x}
					{cy}
					{r}
					class="dot"
					class:selected={isSelected}
					class:hovered={isHovered}
					class:has-issues={hasIssues}
					onmouseenter={() => handleDotEnter(node.songKey)}
					onmouseleave={scheduleHoverClear}
					onclick={() => selectSong(node.songKey)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') selectSong(node.songKey);
					}}
					role="button"
					tabindex={0}
					aria-label="{node.title} — {Math.round(node.coveragePercent)}% explained"
				/>
			{/each}
		</svg>

		{#if hoveredNode}
			<div
				class="tooltip"
				style:left={tooltipLeft + 'px'}
				style:top={tooltipTopY - DOT_RADIUS - 6 + 'px'}
				style:width={TOOLTIP_WIDTH + 'px'}
				style:transform="translateY(-100%)"
				onmouseenter={cancelHoverClear}
				onmouseleave={scheduleHoverClear}
				role="none"
			>
				<button class="song-card" onclick={() => selectSong(hoveredNode.songKey)}>
					<span class="song-title">{hoveredNode.title}</span>
					<span class="song-artists">{hoveredNode.artists.join(', ')}</span>
					<span class="song-stats">{Math.round(hoveredNode.coveragePercent)}% chord coverage</span>
					<ChordProgressionIssuesNote
						songKey={hoveredNode.songKey}
						size="sm"
						inline
						brightensOnParentHover
					/>
					<div class="coverage-bar" aria-hidden="true">
						<div
							class="coverage-fill"
							style:width={Math.min(hoveredNode.coveragePercent, 100) + '%'}
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
		font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
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
		font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
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
		font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
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

	.dot.selected {
		fill: #89b4fa;
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

	.dot.has-issues.selected {
		fill: #f87171;
		stroke: rgba(255, 255, 255, 0.9);
		stroke-width: 1.5px;
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
		font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
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
