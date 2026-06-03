<script lang="ts">
	import { bin, max, scaleLinear, tickStep } from "d3";
	import { chordSearchDemoStore } from "../chordSearchDemoStore.svelte.js";
	import {
		PCT_OF_SONG_DOMAIN,
		PCT_OF_SONG_DOMAIN_MAX,
		PCT_OF_SONG_DOMAIN_MIN,
		pctOfSongFromGroupedResult,
		type PctOfSongRangeFilter
	} from "../pctOfSong.js";
	import {
		PROGRESSION_PCT_HISTOGRAM_AXIS_TICK_COUNT,
		PROGRESSION_PCT_HISTOGRAM_BAR_FILL,
		PROGRESSION_PCT_HISTOGRAM_BIN_COUNT,
		PROGRESSION_PCT_HISTOGRAM_BRUSH_FILL,
		PROGRESSION_PCT_HISTOGRAM_BRUSH_HINT,
		PROGRESSION_PCT_HISTOGRAM_BRUSH_STROKE,
		PROGRESSION_PCT_HISTOGRAM_EMPTY_MESSAGE,
		PROGRESSION_PCT_HISTOGRAM_IDLE_MESSAGE,
		PROGRESSION_PCT_HISTOGRAM_HEIGHT_PX,
		PROGRESSION_PCT_HISTOGRAM_MARGIN_BOTTOM_PX,
		PROGRESSION_PCT_HISTOGRAM_MARGIN_LEFT_PX,
		PROGRESSION_PCT_HISTOGRAM_MARGIN_RIGHT_PX,
		PROGRESSION_PCT_HISTOGRAM_MARGIN_TOP_PX,
		PROGRESSION_PCT_HISTOGRAM_TITLE
	} from "../constants.js";

	const PERCENT_BASELINE_MAX = 1;
	const AXIS_PERCENT_MAX_FRACTION_DIGITS = 0;

	const hasSearchChords = $derived(chordSearchDemoStore.searchChords.length > 0);
	const pctValues = $derived.by(() => {
		if (!hasSearchChords) return [] as number[];

		return chordSearchDemoStore.allGroupedSearchResults.map(
			pctOfSongFromGroupedResult
		);
	});
	const hasData = $derived(pctValues.length > 0);

	const placeholderMessage = $derived(
		hasSearchChords
			? PROGRESSION_PCT_HISTOGRAM_EMPTY_MESSAGE
			: PROGRESSION_PCT_HISTOGRAM_IDLE_MESSAGE
	);

	let containerWidth = $state(0);
	let brushDrag = $state<{ startPlotX: number; currentPlotX: number } | null>(null);

	const activePctRange = $derived(chordSearchDemoStore.pctOfSongRangeFilter);

	const plotWidth = $derived(
		Math.max(
			containerWidth -
				PROGRESSION_PCT_HISTOGRAM_MARGIN_LEFT_PX -
				PROGRESSION_PCT_HISTOGRAM_MARGIN_RIGHT_PX,
			0
		)
	);
	const plotHeight = $derived(
		PROGRESSION_PCT_HISTOGRAM_HEIGHT_PX -
			PROGRESSION_PCT_HISTOGRAM_MARGIN_TOP_PX -
			PROGRESSION_PCT_HISTOGRAM_MARGIN_BOTTOM_PX
	);

	const histogramBins = $derived.by(() => {
		if (!hasData) return [] as Array<{ x0: number; x1: number; length: number }>;

		return bin<number, number>()
			.domain([...PCT_OF_SONG_DOMAIN])
			.thresholds(PROGRESSION_PCT_HISTOGRAM_BIN_COUNT)(pctValues);
	});

	const maxBinCount = $derived(
		Math.max(max(histogramBins, (bucket) => bucket.length) ?? 0, PERCENT_BASELINE_MAX)
	);

	const xScale = $derived.by(() =>
		scaleLinear()
			.domain([PCT_OF_SONG_DOMAIN_MIN, PCT_OF_SONG_DOMAIN_MAX])
			.range([0, plotWidth])
	);

	const yScale = $derived.by(() =>
		scaleLinear().domain([0, maxBinCount]).range([plotHeight, 0])
	);

	const pctTicks = $derived.by(() => {
		const step = tickStep(
			PCT_OF_SONG_DOMAIN_MIN,
			PCT_OF_SONG_DOMAIN_MAX,
			PROGRESSION_PCT_HISTOGRAM_AXIS_TICK_COUNT
		);
		const ticks: number[] = [];

		for (
			let pct = PCT_OF_SONG_DOMAIN_MIN;
			pct <= PCT_OF_SONG_DOMAIN_MAX;
			pct += step
		) {
			ticks.push(pct);
		}

		if (ticks[ticks.length - 1] !== PCT_OF_SONG_DOMAIN_MAX) {
			ticks.push(PCT_OF_SONG_DOMAIN_MAX);
		}

		return ticks;
	});

	const countTicks = $derived.by(() => {
		const step = tickStep(0, maxBinCount, PROGRESSION_PCT_HISTOGRAM_AXIS_TICK_COUNT);
		const ticks: number[] = [];

		for (let count = 0; count <= maxBinCount; count += step) {
			ticks.push(count);
		}

		if (ticks[ticks.length - 1] !== maxBinCount) {
			ticks.push(maxBinCount);
		}

		return ticks;
	});

	const pctAxisLabelFormatter = new Intl.NumberFormat("en-US", {
		maximumFractionDigits: AXIS_PERCENT_MAX_FRACTION_DIGITS
	});

	const selectionRect = $derived.by(() => {
		if (brushDrag) {
			const leftPlotX = Math.min(brushDrag.startPlotX, brushDrag.currentPlotX);
			const rightPlotX = Math.max(brushDrag.startPlotX, brushDrag.currentPlotX);
			return { x: leftPlotX, width: rightPlotX - leftPlotX };
		}

		if (!activePctRange) return null;

		const [minPct, maxPct] = activePctRange;
		return {
			x: xScale(minPct),
			width: Math.max(xScale(maxPct) - xScale(minPct), 0)
		};
	});

	const chartAriaLabel = $derived.by(() => {
		if (!hasData) return placeholderMessage;

		if (!activePctRange) {
			return "Distribution of progression length as percent of each matching song";
		}

		const [minPct, maxPct] = activePctRange;
		return minPct === maxPct
			? `Progression percent of song histogram, filtered to ${minPct}%`
			: `Progression percent of song histogram, filtered to ${minPct}% through ${maxPct}%`;
	});

	const plotXFromClientX = (clientX: number, svgLeft: number): number => {
		const relativeX =
			clientX - svgLeft - PROGRESSION_PCT_HISTOGRAM_MARGIN_LEFT_PX;
		return Math.min(Math.max(relativeX, 0), plotWidth);
	};

	const pctRangeFromPlotXs = (
		leftPlotX: number,
		rightPlotX: number
	): PctOfSongRangeFilter => {
		const loPlotX = Math.min(leftPlotX, rightPlotX);
		const hiPlotX = Math.max(leftPlotX, rightPlotX);
		const minPct = Math.round(xScale.invert(loPlotX));
		const maxPct = Math.round(xScale.invert(hiPlotX));
		return [Math.min(minPct, maxPct), Math.max(minPct, maxPct)] as const;
	};

	const brushOverlay = (event: PointerEvent): SVGRectElement =>
		event.currentTarget as SVGRectElement;

	const onBrushPointerDown = (event: PointerEvent) => {
		if (plotWidth <= 0) return;

		const overlay = brushOverlay(event);
		const svg = overlay.ownerSVGElement;
		if (!svg) return;

		const bounds = svg.getBoundingClientRect();
		const plotX = plotXFromClientX(event.clientX, bounds.left);
		brushDrag = { startPlotX: plotX, currentPlotX: plotX };
		overlay.setPointerCapture(event.pointerId);
	};

	const onBrushPointerMove = (event: PointerEvent) => {
		if (!brushDrag) return;

		const svg = brushOverlay(event).ownerSVGElement;
		if (!svg) return;

		const bounds = svg.getBoundingClientRect();
		brushDrag = {
			...brushDrag,
			currentPlotX: plotXFromClientX(event.clientX, bounds.left)
		};
	};

	const onBrushPointerUp = (event: PointerEvent) => {
		if (!brushDrag) return;

		const overlay = brushOverlay(event);
		if (overlay.hasPointerCapture(event.pointerId)) {
			overlay.releasePointerCapture(event.pointerId);
		}

		const { startPlotX, currentPlotX } = brushDrag;
		brushDrag = null;

		if (startPlotX === currentPlotX) {
			chordSearchDemoStore.clearPctOfSongRangeFilter();
			return;
		}

		chordSearchDemoStore.setPctOfSongRangeFilter(
			pctRangeFromPlotXs(startPlotX, currentPlotX)
		);
	};

	const onBrushPointerCancel = (event: PointerEvent) => {
		const overlay = brushOverlay(event);
		if (overlay.hasPointerCapture(event.pointerId)) {
			overlay.releasePointerCapture(event.pointerId);
		}
		brushDrag = null;
	};

	const onBrushDoubleClick = () => {
		brushDrag = null;
		chordSearchDemoStore.clearPctOfSongRangeFilter();
	};
</script>

<section class="histogram-section">
	<p class="chart-title">{PROGRESSION_PCT_HISTOGRAM_TITLE}</p>
	<div
		class="chart-wrap"
		bind:clientWidth={containerWidth}
		style:height="{PROGRESSION_PCT_HISTOGRAM_HEIGHT_PX}px"
		title={hasData ? PROGRESSION_PCT_HISTOGRAM_BRUSH_HINT : undefined}
	>
		{#if hasData && plotWidth > 0}
			<svg
					class="chart"
					class:chart-brushing={brushDrag !== null}
					width={containerWidth}
					height={PROGRESSION_PCT_HISTOGRAM_HEIGHT_PX}
					role="img"
					aria-label={chartAriaLabel}
				>
					<g
						transform="translate({PROGRESSION_PCT_HISTOGRAM_MARGIN_LEFT_PX}, {PROGRESSION_PCT_HISTOGRAM_MARGIN_TOP_PX})"
					>
						{#each countTicks as count (count)}
							<line
								class="grid-line"
								x1="0"
								x2={plotWidth}
								y1={yScale(count)}
								y2={yScale(count)}
							/>
							<text
								class="axis-label y-axis-label"
								x="-8"
								y={yScale(count)}
								text-anchor="end"
							>
								{count}
							</text>
						{/each}

						{#each histogramBins as bucket (bucket.x0)}
							<rect
								class="bar"
								x={xScale(bucket.x0 ?? PCT_OF_SONG_DOMAIN_MIN)}
								y={yScale(bucket.length)}
								width={Math.max(
									xScale(bucket.x1 ?? PCT_OF_SONG_DOMAIN_MAX) -
										xScale(bucket.x0 ?? PCT_OF_SONG_DOMAIN_MIN),
									0
								)}
								height={Math.max(plotHeight - yScale(bucket.length), 0)}
								fill={PROGRESSION_PCT_HISTOGRAM_BAR_FILL}
							/>
						{/each}

						{#each pctTicks as pct (pct)}
							<text
								class="axis-label x-axis-label"
								x={xScale(pct)}
								y={plotHeight + 16}
								text-anchor="middle"
							>
								{pctAxisLabelFormatter.format(pct)}%
							</text>
						{/each}

						{#if selectionRect}
							<rect
								class="brush-selection"
								x={selectionRect.x}
								y="0"
								width={selectionRect.width}
								height={plotHeight}
								fill={PROGRESSION_PCT_HISTOGRAM_BRUSH_FILL}
								stroke={PROGRESSION_PCT_HISTOGRAM_BRUSH_STROKE}
							/>
						{/if}

						<rect
							class="brush-overlay"
							role="button"
							aria-label={PROGRESSION_PCT_HISTOGRAM_BRUSH_HINT}
							tabindex="0"
							x="0"
							y="0"
							width={plotWidth}
							height={plotHeight}
							fill="transparent"
							onpointerdown={onBrushPointerDown}
							onpointermove={onBrushPointerMove}
							onpointerup={onBrushPointerUp}
							onpointercancel={onBrushPointerCancel}
							ondblclick={onBrushDoubleClick}
						/>
					</g>
			</svg>
		{:else}
			<p class="empty-placeholder">{placeholderMessage}</p>
		{/if}
	</div>
</section>

<style>
	.histogram-section {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		width: 100%;
		min-width: 0;
	}

	.chart-title {
		font-size: 0.6875rem;
		color: #71717a;
		margin: 0;
		line-height: 1.4;
	}

	.chart-wrap {
		position: relative;
		width: 100%;
		border: 1px solid rgba(39, 39, 42, 0.8);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.4);
		overflow: hidden;
	}

	.chart {
		display: block;
	}

	.chart-brushing {
		cursor: crosshair;
	}

	.brush-overlay {
		cursor: crosshair;
	}

	.brush-selection {
		pointer-events: none;
		stroke-width: 1;
	}

	.grid-line {
		stroke: rgba(255, 255, 255, 0.06);
		stroke-width: 1;
	}

	.bar {
		opacity: 0.85;
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

	.empty-placeholder {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0;
		padding: 0 1.5rem;
		font-size: 0.75rem;
		color: #71717a;
		text-align: center;
		font-style: italic;
		line-height: 1.4;
	}
</style>
