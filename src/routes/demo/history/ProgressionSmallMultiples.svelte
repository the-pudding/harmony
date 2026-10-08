<script module lang="ts">
	import type { EraYearRow } from "./eraAnalysis.js";

	export type ProgressionMultiple = {
		rank: number;
		name: string;
		chordProgression: string;
		color: string;
		rows: EraYearRow[];
	};
</script>

<script lang="ts">
	import { area as d3area, line as d3line, scaleLinear } from "d3";
	import {
		CHART_AXIS_LABEL_FILL,
		CHART_GRID_STROKE,
		CHART_HOVER_LINE_STROKE
	} from "../define-chord-progression/constants.js";

	type Props = { multiples: ProgressionMultiple[] };

	const { multiples }: Props = $props();

	const PANEL_HEIGHT = 64;
	const PAD_LEFT = 30;
	const PAD_RIGHT = 6;
	const PAD_TOP = 4;
	const PAD_BOTTOM = 14;
	const LINE_STROKE_WIDTH = 1.25;
	const DOT_RADIUS = 3;

	let hoveredYear = $state<number | null>(null);
	let panelWidth = $state(0);

	const years = $derived(multiples[0]?.rows.map((row) => row.year) ?? []);

	// One y-axis max shared by every panel, so heights compare directly
	// across progressions.
	const yMax = $derived(
		Math.max(1, ...multiples.flatMap((m) => m.rows.map((r) => r.matchedPercent)))
	);

	const plotWidth = $derived(Math.max(panelWidth - PAD_LEFT - PAD_RIGHT, 0));
	const plotHeight = PANEL_HEIGHT - PAD_TOP - PAD_BOTTOM;

	const xScale = $derived(
		scaleLinear()
			.domain([years[0] ?? 0, years[years.length - 1] ?? 1])
			.range([PAD_LEFT, PAD_LEFT + plotWidth])
	);

	const yScale = $derived(
		scaleLinear().domain([0, yMax]).range([PAD_TOP + plotHeight, PAD_TOP])
	);

	const formatPercent = (value: number): string =>
		`${value >= 10 ? Math.round(value) : Math.round(value * 10) / 10}%`;

	// Straight segments between raw yearly points — no curve interpolation,
	// so year-to-year jumps show as they are.
	const pathsFor = (rows: EraYearRow[]) => {
		if (plotWidth <= 0 || rows.length === 0) return { line: "", area: "" };
		const x = (r: EraYearRow) => xScale(r.year);
		return {
			line:
				d3line<EraYearRow>()
					.x(x)
					.y((r) => yScale(r.matchedPercent))(rows) ?? "",
			area:
				d3area<EraYearRow>()
					.x(x)
					.y0(yScale(0))
					.y1((r) => yScale(r.matchedPercent))(rows) ?? ""
		};
	};

	const peakOf = (rows: EraYearRow[]): EraYearRow | null =>
		rows.reduce<EraYearRow | null>(
			(best, r) => (best === null || r.matchedPercent > best.matchedPercent ? r : best),
			null
		);

	// Hover is synced across every panel: pointing at a year in one shows
	// that year's value in all of them, so you can scan the whole grid.
	function handlePointerMove(event: PointerEvent) {
		if (plotWidth <= 0 || years.length === 0) return;
		const bounds = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
		const year = Math.round(xScale.invert(event.clientX - bounds.left));
		hoveredYear = years.reduce((closest, candidate) =>
			Math.abs(candidate - year) < Math.abs(closest - year) ? candidate : closest
		);
	}
</script>

<div class="small-multiples">
	<div class="toolbar">
		{#if hoveredYear !== null}
			<span class="toolbar-hover">showing {hoveredYear}</span>
		{/if}
	</div>

	<div class="grid">
		{#each multiples as m (m.name)}
			{@const paths = pathsFor(m.rows)}
			{@const peak = peakOf(m.rows)}
			{@const hovered =
				hoveredYear === null ? null : m.rows.find((r) => r.year === hoveredYear)}
			<div class="panel">
				<span class="panel-name" title={m.name}
					><span class="panel-rank">{m.rank}</span>{m.name}</span
				>
				<div class="panel-subhead">
					<span class="panel-chords">{m.chordProgression}</span>
					<span class="panel-value">
						{#if hovered}
							{hovered.matchedPercent.toFixed(1)}%
						{:else if peak}
							peak {peak.year} · {peak.matchedPercent.toFixed(1)}%
						{/if}
					</span>
				</div>
				<div class="panel-chart" bind:clientWidth={panelWidth}>
					{#if plotWidth > 0}
						<svg
							width={panelWidth}
							height={PANEL_HEIGHT}
							role="img"
							aria-label="{m.name}: % of songs per year"
							onpointermove={handlePointerMove}
							onpointerleave={() => (hoveredYear = null)}
						>
							{#each [0, yMax] as tick (tick)}
								<line
									x1={PAD_LEFT}
									x2={PAD_LEFT + plotWidth}
									y1={yScale(tick)}
									y2={yScale(tick)}
									stroke={CHART_GRID_STROKE}
								/>
								<text
									class="axis-label y-axis-label"
									x={PAD_LEFT - 4}
									y={yScale(tick)}
									text-anchor="end"
									fill={CHART_AXIS_LABEL_FILL}>{formatPercent(tick)}</text
								>
							{/each}
							{#if hoveredYear !== null}
								<line
									x1={xScale(hoveredYear)}
									x2={xScale(hoveredYear)}
									y1={PAD_TOP}
									y2={PAD_TOP + plotHeight}
									stroke={CHART_HOVER_LINE_STROKE}
								/>
							{/if}
							<path d={paths.area} fill={m.color} fill-opacity="0.18" />
							<path
								d={paths.line}
								fill="none"
								stroke={m.color}
								stroke-width={LINE_STROKE_WIDTH}
								stroke-linejoin="round"
							/>
							{#if hovered}
								<circle
									cx={xScale(hovered.year)}
									cy={yScale(hovered.matchedPercent)}
									r={DOT_RADIUS}
									fill={m.color}
								/>
							{/if}
							{#if years.length > 0}
								<text
									class="axis-label"
									x={PAD_LEFT}
									y={PANEL_HEIGHT - 2}
									text-anchor="start"
									fill={CHART_AXIS_LABEL_FILL}>{years[0]}</text
								>
								<text
									class="axis-label"
									x={PAD_LEFT + plotWidth}
									y={PANEL_HEIGHT - 2}
									text-anchor="end"
									fill={CHART_AXIS_LABEL_FILL}>{years[years.length - 1]}</text
								>
							{/if}
						</svg>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.small-multiples {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.toolbar {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		min-height: 1rem;
		font-size: 0.7rem;
		color: #a1a1aa;
	}


	.toolbar-hover {
		margin-left: auto;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		color: #d4d4d8;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(11.5rem, 1fr));
		gap: 0.75rem;
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
		padding: 0.5rem 0.5rem 0.25rem;
		border: 1px solid rgba(63, 63, 70, 0.5);
		border-radius: 0.375rem;
	}

	.panel-subhead {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.375rem;
		min-width: 0;
	}

	.panel-name {
		font-size: 0.7rem;
		font-weight: 600;
		color: #f4f4f5;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.panel-rank {
		margin-right: 0.375rem;
		color: #71717a;
		font-weight: 500;
	}

	.panel-value {
		flex-shrink: 0;
		font-size: 0.625rem;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		color: #d4d4d8;
	}

	.panel-chords {
		font-size: 0.625rem;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
		color: #71717a;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.panel-chart {
		width: 100%;
	}

	svg {
		display: block;
		cursor: crosshair;
	}

	.y-axis-label {
		dominant-baseline: middle;
	}

	.axis-label {
		font-size: 0.6rem;
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}
</style>
