<script lang="ts">
	import { curveMonotoneX, line as d3line, scaleLinear } from "d3";
	import {
		progressionGroupLegendItems,
		UNGROUPED_PROGRESSION_GROUP_LABEL
	} from "$data/core-progressions.js";
	import { dominantProgressionGroupName } from "$data/core-progressions.util.js";
	import type { GroupedSong } from "../../../data/songBrowser.js";
	import type { AllSongsCoverageResult } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
	import { toCalendarYear } from "../../../data/songYear.js";

	type Props = {
		coverageResult: AllSongsCoverageResult | null;
		songByKey: ReadonlyMap<string, GroupedSong>;
	};

	const { coverageResult, songByKey }: Props = $props();

	type DecadePoint = { decade: number; sharePercent: number; songCount: number };
	type GroupSeries = { label: string; color: string; points: DecadePoint[] };

	const MARGIN_LEFT = 34;
	const MARGIN_RIGHT = 16;
	const MARGIN_TOP = 12;
	const MARGIN_BOTTOM = 26;
	const CHART_HEIGHT = 220;
	const DECADE_SPAN = 10;
	const DECADE_PADDING = 4;
	const DOT_RADIUS = 3;
	const HOVER_DOT_RADIUS = 4.5;
	const HIT_PATH_STROKE_WIDTH = 14;
	const Y_TICKS = [0, 25, 50, 75, 100];

	let containerWidth = $state(0);
	let hoveredDecade = $state<number | null>(null);
	let selectedLabel = $state<string | null>(null);

	const decadeOf = (year: number): number =>
		Math.floor(toCalendarYear(year) / DECADE_SPAN) * DECADE_SPAN;

	const rows = $derived.by(() => {
		if (!coverageResult) return [];
		return coverageResult.songCoverages.flatMap((entry) => {
			const year = songByKey.get(entry.songKey)?.year;
			if (year === undefined) return [];
			const label =
				dominantProgressionGroupName(entry.progressionCounts) ??
				UNGROUPED_PROGRESSION_GROUP_LABEL;
			return [{ decade: decadeOf(year), label }];
		});
	});

	const decades = $derived(
		[...new Set(rows.map((row) => row.decade))].sort((a, b) => a - b)
	);

	const totalByDecade = $derived.by(() => {
		const totals = new Map<number, number>();
		for (const row of rows) {
			totals.set(row.decade, (totals.get(row.decade) ?? 0) + 1);
		}
		return totals;
	});

	const series = $derived.by((): GroupSeries[] =>
		progressionGroupLegendItems.map((item) => {
			const countByDecade = new Map<number, number>();
			for (const row of rows) {
				if (row.label !== item.label) continue;
				countByDecade.set(row.decade, (countByDecade.get(row.decade) ?? 0) + 1);
			}
			const points = decades.map((decade): DecadePoint => {
				const total = totalByDecade.get(decade) ?? 0;
				const songCount = countByDecade.get(decade) ?? 0;
				return {
					decade,
					songCount,
					sharePercent: total > 0 ? (songCount / total) * 100 : 0
				};
			});
			return { label: item.label, color: item.color, points };
		})
	);

	const hasData = $derived(decades.length > 0);

	const plotWidth = $derived(
		Math.max(containerWidth - MARGIN_LEFT - MARGIN_RIGHT, 0)
	);
	const plotHeight = CHART_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

	const domain = $derived.by((): [number, number] => {
		if (decades.length === 0) return [0, 1];
		const min = decades[0] - DECADE_PADDING;
		const max = decades[decades.length - 1] + DECADE_SPAN + DECADE_PADDING;
		return [min, max];
	});

	const xScale = $derived(scaleLinear().domain(domain).range([0, plotWidth]));
	const yScale = $derived(scaleLinear().domain([0, 100]).range([plotHeight, 0]));

	const pointX = (decade: number) => xScale(decade + DECADE_SPAN / 2);

	const linePaths = $derived.by(() => {
		if (plotWidth <= 0) return [];
		const lineGen = d3line<DecadePoint>()
			.x((p) => pointX(p.decade))
			.y((p) => yScale(p.sharePercent))
			.curve(curveMonotoneX);
		return series.map((s) => ({
			label: s.label,
			color: s.color,
			d: lineGen(s.points) ?? ""
		}));
	});

	const decadeLabel = (decade: number): string => `${decade}s`;

	const hoveredRows = $derived.by(() => {
		if (hoveredDecade === null) return [];
		const decade = hoveredDecade;
		return series
			.map((s) => ({
				label: s.label,
				color: s.color,
				point: s.points.find((p) => p.decade === decade) ?? null
			}))
			.filter(
				(row): row is { label: string; color: string; point: DecadePoint } =>
					row.point !== null
			)
			.sort((a, b) => b.point.sharePercent - a.point.sharePercent);
	});

	const hoveredTotal = $derived(
		hoveredDecade === null ? 0 : (totalByDecade.get(hoveredDecade) ?? 0)
	);

	function handlePointerMove(event: PointerEvent) {
		if (plotWidth <= 0 || decades.length === 0) return;
		const svg = event.currentTarget as SVGSVGElement;
		const bounds = svg.getBoundingClientRect();
		const relativeX = event.clientX - bounds.left - MARGIN_LEFT;
		const year = xScale.invert(Math.min(Math.max(relativeX, 0), plotWidth));
		hoveredDecade = decades.reduce((closest, decade) => {
			const mid = decade + DECADE_SPAN / 2;
			const closestMid = closest + DECADE_SPAN / 2;
			return Math.abs(mid - year) < Math.abs(closestMid - year) ? decade : closest;
		}, decades[0]);
	}

	function clearHover() {
		hoveredDecade = null;
	}

	function selectSeries(label: string) {
		selectedLabel = selectedLabel === label ? null : label;
	}

	function clearSelection() {
		selectedLabel = null;
	}
</script>

<section class="overview">
	<div class="overview-header">
		<h2 class="overview-title">Family share of songs over time</h2>
		<p class="overview-description">
			Of each decade's dated songs, the share whose final chord progression
			belongs to each family — every song counts once, toward its dominant
			family, or toward "{UNGROUPED_PROGRESSION_GROUP_LABEL}" if none matched.
		</p>
	</div>

	{#if !coverageResult}
		<p class="status">Computing coverage…</p>
	{:else if !hasData}
		<p class="status">No dated songs available.</p>
	{:else}
		<div class="chart-wrap" bind:clientWidth={containerWidth}>
			{#if plotWidth > 0}
				<svg
					width={containerWidth}
					height={CHART_HEIGHT}
					role="img"
					aria-label="Share of songs per chord progression family by decade"
					onpointermove={handlePointerMove}
					onpointerleave={clearHover}
				>
					<g transform="translate({MARGIN_LEFT}, {MARGIN_TOP})">
						{#each Y_TICKS as tick (tick)}
							<line
								class="grid-line"
								x1="0"
								x2={plotWidth}
								y1={yScale(tick)}
								y2={yScale(tick)}
							/>
							<text
								class="axis-label y-axis-label"
								x="-8"
								y={yScale(tick)}
								text-anchor="end">{tick}%</text
							>
						{/each}

						{#each decades as decade (decade)}
							<text
								class="axis-label x-axis-label"
								x={pointX(decade)}
								y={plotHeight + 16}
								text-anchor="middle">{decadeLabel(decade)}</text
							>
						{/each}

						<rect
							class="hover-overlay"
							x="0"
							y="0"
							width={plotWidth}
							height={plotHeight}
							fill="transparent"
							role="button"
							tabindex={0}
							aria-label="Clear isolated family"
							onclick={clearSelection}
							onkeydown={(event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									clearSelection();
								}
							}}
						/>

						{#if hoveredDecade !== null}
							<line
								class="hover-line"
								x1={pointX(hoveredDecade)}
								x2={pointX(hoveredDecade)}
								y1="0"
								y2={plotHeight}
							/>
						{/if}

						{#each linePaths as path (path.label)}
							<path
								class="series-line"
								class:dimmed={selectedLabel !== null && selectedLabel !== path.label}
								class:selected={selectedLabel === path.label}
								d={path.d}
								stroke={path.color}
								fill="none"
							/>
						{/each}

						{#each series as s (s.label)}
							{#each s.points as point (point.decade)}
								<circle
									cx={pointX(point.decade)}
									cy={yScale(point.sharePercent)}
									r={hoveredDecade === point.decade
										? HOVER_DOT_RADIUS
										: DOT_RADIUS}
									fill={s.color}
									class="series-dot"
									class:dimmed={selectedLabel !== null && selectedLabel !== s.label}
								/>
							{/each}
						{/each}

						{#each linePaths as path (path.label)}
							<path
								class="series-hit-path"
								d={path.d}
								fill="none"
								stroke="rgba(0, 0, 0, 0.01)"
								stroke-width={HIT_PATH_STROKE_WIDTH}
								role="button"
								tabindex={0}
								aria-label="Isolate {path.label}"
								onclick={(event) => {
									event.stopPropagation();
									selectSeries(path.label);
								}}
								onkeydown={(event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										selectSeries(path.label);
									}
								}}
							/>
						{/each}
					</g>
				</svg>

				{#if hoveredDecade !== null}
					<div class="tooltip">
						<p class="tooltip-title">
							{decadeLabel(hoveredDecade)} · {hoveredTotal.toLocaleString()} dated
							songs
						</p>
						{#each hoveredRows as row (row.label)}
							<p class="tooltip-row">
								<span class="tooltip-dot" style:background={row.color}></span>
								<span class="tooltip-label">{row.label}</span>
								<span class="tooltip-value"
									>{Math.round(row.point.sharePercent)}% ({row.point.songCount})</span
								>
							</p>
						{/each}
					</div>
				{/if}
			{/if}
		</div>

		<div class="legend">
			{#each progressionGroupLegendItems as item (item.label)}
				<button
					type="button"
					class="legend-item"
					class:dimmed={selectedLabel !== null && selectedLabel !== item.label}
					class:selected={selectedLabel === item.label}
					onclick={() => selectSeries(item.label)}
				>
					<span class="legend-dot" style:background={item.color}></span>
					{item.label}
				</button>
			{/each}
		</div>
	{/if}
</section>

<style>
	.overview {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.overview-header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.overview-title {
		font-size: 1rem;
		font-weight: 700;
		margin: 0;
		color: white;
	}

	.overview-description {
		font-size: 0.8125rem;
		color: #71717a;
		margin: 0;
		line-height: 1.5;
	}

	.status {
		font-size: 0.75rem;
		color: rgba(161, 161, 170, 0.5);
		margin: 0;
	}

	.chart-wrap {
		position: relative;
		width: 100%;
		border: 1px solid rgba(39, 39, 42, 0.8);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.4);
		overflow: hidden;
	}

	svg {
		display: block;
	}

	.grid-line {
		stroke: rgba(255, 255, 255, 0.06);
		stroke-width: 1;
	}

	.axis-label {
		fill: #71717a;
		font-size: 0.625rem;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}

	.y-axis-label {
		dominant-baseline: middle;
	}

	.x-axis-label {
		dominant-baseline: hanging;
	}

	.hover-line {
		stroke: rgba(255, 255, 255, 0.25);
		stroke-width: 1;
		pointer-events: none;
	}

	.hover-overlay {
		cursor: crosshair;
	}

	.series-line {
		stroke-width: 2;
		opacity: 0.9;
		transition:
			opacity 0.15s ease,
			stroke-width 0.15s ease;
	}

	.series-line.dimmed {
		opacity: 0.12;
	}

	.series-line.selected {
		opacity: 1;
		stroke-width: 3;
	}

	.series-dot {
		pointer-events: none;
		transition: opacity 0.15s ease;
	}

	.series-dot.dimmed {
		opacity: 0.12;
	}

	.series-hit-path {
		cursor: pointer;
		outline: none;
	}

	.tooltip {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.1875rem;
		background: rgba(9, 9, 11, 0.95);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.375rem;
		padding: 0.5rem 0.625rem;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		pointer-events: none;
		z-index: 2;
	}

	.tooltip-title {
		margin: 0 0 0.125rem;
		font-size: 0.65rem;
		font-weight: 600;
		color: #d4d4d8;
	}

	.tooltip-row {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		margin: 0;
		font-size: 0.625rem;
		color: #a1a1aa;
		white-space: nowrap;
	}

	.tooltip-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.tooltip-label {
		flex: 1;
		min-width: 0;
	}

	.tooltip-value {
		flex-shrink: 0;
		color: #e4e4e7;
		font-variant-numeric: tabular-nums;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.875rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		border: none;
		background: transparent;
		padding: 0;
		font-family: inherit;
		font-size: 0.6875rem;
		color: #a1a1aa;
		cursor: pointer;
		transition:
			opacity 0.15s ease,
			color 0.15s ease;
	}

	.legend-item:hover {
		color: #e4e4e7;
	}

	.legend-item.dimmed {
		opacity: 0.4;
	}

	.legend-item.selected {
		color: #f4f4f5;
		font-weight: 600;
	}

	.legend-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}
</style>
