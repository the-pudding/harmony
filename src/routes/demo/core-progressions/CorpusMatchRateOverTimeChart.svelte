<script lang="ts">
	import { area, curveMonotoneX, line as d3line, scaleLinear, tickStep } from "d3";
	import type { GroupedSong } from "../../../data/songBrowser.js";
	import { toCalendarYear } from "../../../data/songYear.js";
	import type { SongCoverageEntry } from "../define-chord-progression/compute-coverage-of-all-songs/index.js";
	import {
		CHART_AXIS_LABEL_FILL,
		CHART_GRID_STROKE,
		CHART_HOVER_LINE_STROKE,
		CHART_SERIES_ACTIVE_FILL,
		CHART_SERIES_ACTIVE_STROKE,
		CHART_SERIES_FILL,
		CHART_SERIES_STROKE
	} from "../define-chord-progression/constants.js";
	import type { YearDomain } from "../shared/artists/artistStats.js";

	type SongEntry = {
		songKey: string;
		matchingProgressions: string[];
	};

	type YearPoint = {
		year: number;
		matchPercent: number;
		matchedCount: number;
		totalCount: number;
	};

	type Props = {
		corpusSongs: SongCoverageEntry[] | null;
		songByKey: ReadonlyMap<string, GroupedSong>;
		matchProgressions: readonly string[];
		filtered: boolean;
		yearDomain: YearDomain | null;
	};

	const {
		corpusSongs,
		songByKey,
		matchProgressions,
		filtered,
		yearDomain
	}: Props = $props();

	const MARGIN_LEFT = 34;
	const MARGIN_RIGHT = 16;
	const MARGIN_TOP = 12;
	const MARGIN_BOTTOM = 26;
	const CHART_HEIGHT = 140;
	const DOT_RADIUS = 1.5;
	const HOVER_DOT_RADIUS = 2.75;
	const LINE_STROKE_WIDTH = 1.25;
	const YEAR_PADDING = 0.5;
	const TICK_COUNT = 8;
	const Y_TICK_COUNT = 4;
	const PERCENT_SCALE = 100;
	const Y_MAX_BASELINE = 1;
	const LOADING_HEIGHT = 120;
	const EMPTY_HEIGHT = 48;

	const TOOLTIP_OFFSET_X = 12;
	const TOOLTIP_OFFSET_Y = -8;

	let containerWidth = $state(0);
	let hoveredYear = $state<number | null>(null);
	let tooltipPosition = $state<{ x: number; y: number } | null>(null);

	const progressionSet = $derived(new Set(matchProgressions));

	const isMatch = (song: SongEntry): boolean =>
		song.matchingProgressions.some((p) => progressionSet.has(p));

	const points = $derived.by((): YearPoint[] => {
		if (!corpusSongs || !yearDomain || matchProgressions.length === 0) return [];

		const totals = new Map<number, number>();
		const matched = new Map<number, number>();

		for (const song of corpusSongs) {
			const year = songByKey.get(song.songKey)?.year;
			if (year === undefined) continue;
			const calendarYear = toCalendarYear(year);
			totals.set(calendarYear, (totals.get(calendarYear) ?? 0) + 1);
			if (isMatch(song)) {
				matched.set(calendarYear, (matched.get(calendarYear) ?? 0) + 1);
			}
		}

		const years = [...totals.keys()].sort((a, b) => a - b);
		return years.map((year) => {
			const totalCount = totals.get(year) ?? 0;
			const matchedCount = matched.get(year) ?? 0;
			return {
				year,
				matchedCount,
				totalCount,
				matchPercent:
					totalCount > 0 ? (matchedCount / totalCount) * PERCENT_SCALE : 0
			};
		});
	});

	const yMax = $derived(
		Math.max(
			...points.map((point) => point.matchPercent),
			Y_MAX_BASELINE
		)
	);

	const strokeColor = $derived(
		filtered ? CHART_SERIES_ACTIVE_STROKE : CHART_SERIES_STROKE
	);
	const fillColor = $derived(
		filtered ? CHART_SERIES_ACTIVE_FILL : CHART_SERIES_FILL
	);

	const plotWidth = $derived(
		Math.max(containerWidth - MARGIN_LEFT - MARGIN_RIGHT, 0)
	);
	const plotHeight = CHART_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;

	const xScale = $derived(
		scaleLinear()
			.domain(
				yearDomain
					? [yearDomain.min - YEAR_PADDING, yearDomain.max + YEAR_PADDING]
					: [0, 1]
			)
			.range([0, plotWidth])
	);
	const yScale = $derived(
		scaleLinear().domain([0, yMax]).range([plotHeight, 0])
	);

	const xTicks = $derived(
		yearDomain === null
			? []
			: xScale
					.ticks(TICK_COUNT)
					.filter((tick) => Number.isInteger(tick))
					.map((tick) => ({ year: tick, x: xScale(tick) }))
	);

	const yTicks = $derived.by(() => {
		const step = tickStep(0, yMax, Y_TICK_COUNT);
		const ticks: number[] = [];
		for (let value = 0; value <= yMax; value += step) {
			ticks.push(value);
		}
		if (ticks[ticks.length - 1] !== yMax) {
			ticks.push(yMax);
		}
		return ticks;
	});

	const formatYTick = (value: number): string => {
		const rounded =
			value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
		return `${rounded}%`;
	};

	const areaPath = $derived.by(() => {
		if (plotWidth <= 0 || points.length === 0) return "";
		return (
			area<YearPoint>()
				.x((p) => xScale(p.year))
				.y0(plotHeight)
				.y1((p) => yScale(p.matchPercent))
				.curve(curveMonotoneX)(points) ?? ""
		);
	});

	const linePath = $derived.by(() => {
		if (plotWidth <= 0 || points.length === 0) return "";
		return (
			d3line<YearPoint>()
				.x((p) => xScale(p.year))
				.y((p) => yScale(p.matchPercent))
				.curve(curveMonotoneX)(points) ?? ""
		);
	});

	const hoveredPoint = $derived(
		hoveredYear === null
			? null
			: (points.find((p) => p.year === hoveredYear) ?? null)
	);

	function handlePointerMove(event: PointerEvent) {
		if (plotWidth <= 0 || points.length === 0) return;
		const svg = event.currentTarget as SVGSVGElement;
		const bounds = svg.getBoundingClientRect();
		const relativeX = event.clientX - bounds.left - MARGIN_LEFT;
		const year = xScale.invert(Math.min(Math.max(relativeX, 0), plotWidth));
		hoveredYear = points.reduce(
			(closest, point) =>
				Math.abs(point.year - year) < Math.abs(closest - year)
					? point.year
					: closest,
			points[0].year
		);
		tooltipPosition = {
			x: event.clientX - bounds.left,
			y: event.clientY - bounds.top
		};
	}

	function clearHover() {
		hoveredYear = null;
		tooltipPosition = null;
	}
</script>

<div class="chart" bind:clientWidth={containerWidth}>
	{#if corpusSongs === null}
		<div class="loading-shell" style:height={LOADING_HEIGHT + "px"}>
			<span class="loading-text">Computing coverage…</span>
		</div>
	{:else if yearDomain === null || points.length === 0}
		<div class="empty" style:height={EMPTY_HEIGHT + "px"}>
			No release years available.
		</div>
	{:else if plotWidth > 0}
		<svg
			width={containerWidth}
			height={CHART_HEIGHT}
			role="img"
			aria-label="Percentage of corpus songs matched by release year"
			onpointermove={handlePointerMove}
			onpointerleave={clearHover}
		>
			<g transform="translate({MARGIN_LEFT}, {MARGIN_TOP})">
				{#each yTicks as tick (tick)}
					<line
						class="grid-line"
						x1="0"
						x2={plotWidth}
						y1={yScale(tick)}
						y2={yScale(tick)}
						stroke={CHART_GRID_STROKE}
					/>
					<text
						class="axis-label y-axis-label"
						x="-8"
						y={yScale(tick)}
						text-anchor="end"
						fill={CHART_AXIS_LABEL_FILL}>{formatYTick(tick)}</text
					>
				{/each}

				{#each xTicks as tick (tick.year)}
					<text
						class="axis-label x-axis-label"
						x={tick.x}
						y={plotHeight + 16}
						text-anchor="middle"
						fill={CHART_AXIS_LABEL_FILL}>{tick.year}</text
					>
				{/each}

				{#if hoveredPoint}
					<line
						class="hover-line"
						x1={xScale(hoveredPoint.year)}
						x2={xScale(hoveredPoint.year)}
						y1="0"
						y2={plotHeight}
						stroke={CHART_HOVER_LINE_STROKE}
					/>
				{/if}

				<path class="area" d={areaPath} fill={fillColor} />
				<path
					class="line"
					d={linePath}
					fill="none"
					stroke={strokeColor}
					stroke-width={LINE_STROKE_WIDTH}
				/>

				{#each points as point (point.year)}
					<circle
						cx={xScale(point.year)}
						cy={yScale(point.matchPercent)}
						r={hoveredYear === point.year ? HOVER_DOT_RADIUS : DOT_RADIUS}
						fill={strokeColor}
						class="dot"
					/>
				{/each}
			</g>
		</svg>

		{#if hoveredPoint && tooltipPosition}
			<div
				class="tooltip"
				style:left="{tooltipPosition.x + TOOLTIP_OFFSET_X}px"
				style:top="{tooltipPosition.y + TOOLTIP_OFFSET_Y}px"
			>
				<p class="tooltip-row">
					In <span class="tooltip-emphasis">{hoveredPoint.year}</span>
				</p>
				<p class="tooltip-row">
					<span class="tooltip-emphasis"
						>{Math.round(hoveredPoint.matchPercent)}%</span
					>
					of songs matched
				</p>
			</div>
		{/if}
	{/if}
</div>

<style>
	.chart {
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
	}

	.axis-label {
		font-size: 0.6rem;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}

	.y-axis-label {
		dominant-baseline: middle;
	}

	.x-axis-label {
		dominant-baseline: hanging;
	}

	.hover-line {
		stroke-width: 1;
		pointer-events: none;
	}

	.line {
		transition: stroke 0.15s ease;
	}

	.area {
		transition: fill 0.15s ease;
	}

	.dot {
		pointer-events: none;
		transition:
			r 0.1s ease,
			fill 0.15s ease;
	}

	.tooltip {
		position: absolute;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		background: rgba(9, 9, 11, 0.95);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.375rem;
		padding: 0.5rem 0.625rem;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		pointer-events: none;
		z-index: 2;
	}

	.tooltip-row {
		margin: 0;
		font-size: 0.625rem;
		color: #a1a1aa;
		white-space: nowrap;
	}

	.tooltip-emphasis {
		font-weight: 700;
		color: #e4e4e7;
	}
</style>
