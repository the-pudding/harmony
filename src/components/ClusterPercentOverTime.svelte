<script>
	import { area, curveMonotoneX, extent, line, max, scaleLinear } from "d3";
	import Chord from "$components/Chord.svelte";
	import progressionsData from "$data/charts/top-progressions.csv";
	import {
		clusterSlug,
		keyFromByYearFile,
		slugFromByYearFile
	} from "$utils/clusterChartFile";

	let { cluster, small = false } = $props();

	const files = import.meta.glob("$data/charts/*_by_year.csv", {
		eager: true,
		import: "default"
	});
	const dataByKey = Object.fromEntries(
		Object.entries(files).map(([filePath, rows]) => [
			keyFromByYearFile(filePath),
			{ rows, slug: slugFromByYearFile(filePath) }
		])
	);

	const entry = $derived(dataByKey[clusterSlug(cluster ?? "")]);
	// The real progression (name + chords) behind the file — for decade files
	// this is whichever signature progression the build picked.
	const progression = $derived(
		progressionsData.find((d) => clusterSlug(d.name) === entry?.slug)
	);

	const name = $derived(progression?.name ?? cluster);

	const margin = { top: 16, right: 16, bottom: 32, left: 40 };
	const height = small ? 120 : 240;

	let width = $state(0);

	const rows = $derived(
		(entry?.rows ?? []).map((d) => ({
			year: +d.year,
			percent: +d.percent
		}))
	);

	const x = $derived(
		scaleLinear()
			.domain(extent(rows, (d) => d.year))
			.range([margin.left, width - margin.right])
	);
	const y = $derived(
		scaleLinear()
			.domain([0, max(rows, (d) => d.percent) ?? 0])
			.nice()
			.range([height - margin.bottom, margin.top])
	);
	const path = $derived(
		line()
			.curve(curveMonotoneX)
			.x((d) => x(d.year))
			.y((d) => y(d.percent))(rows)
	);
	const areaPath = $derived(
		area()
			.curve(curveMonotoneX)
			.x((d) => x(d.year))
			.y0(y(0))
			.y1((d) => y(d.percent))(rows)
	);
</script>

{#if rows.length}
	<figure
		id="{cluster}-percent-over-time"
		class="cluster-percent-over-time"
		class:small
		bind:clientWidth={width}
	>
		<div class="chart-title">
			{#if small}
				<strong class="cluster-name-small">{name}</strong>
				{#if progression}
					<span class="chords" data-chords={progression.chordProgression}>
						{#each progression.chordProgression.split("-") as chord, i (i)}
							<Chord {chord} tonality={progression.scale} />
						{/each} ({cluster})
					</span>
				{/if}
			{:else}
				Percent of songs that use the
				<strong>{name}</strong>
				progression
			{/if}
		</div>

		{#if width}
			<svg {width} {height}>
				{#each y.ticks(small ? 2 : 4) as tick (tick)}
					<g class="tick" transform="translate(0, {y(tick)})">
						<line x1={margin.left} x2={width - margin.right} />
						<text x={margin.left - 6} dy="0.32em" text-anchor="end"
							>{tick}%</text
						>
					</g>
				{/each}
				{#each x.ticks(6) as tick (tick)}
					<text
						class="tick"
						x={x(tick)}
						y={height - margin.bottom + 20}
						text-anchor="middle">{tick}</text
					>
				{/each}
				<path class="area" d={areaPath} />
				<path class="line" d={path} />
			</svg>
		{/if}
	</figure>
{/if}

<style>
	figure {
		width: 100%;
		max-width: 700px;
		margin: 2rem auto;
	}

	figure.small {
		margin: 0 auto;
	}

	.chords {
		font-size: var(--14px);
		margin-left: 0.25rem;
	}

	svg {
		display: block;
		overflow: visible;
	}

	.tick line {
		stroke: var(--color-fg);
		opacity: 0.15;
	}

	.tick text,
	text.tick {
		fill: var(--color-fg);
		opacity: 0.6;
		font-size: var(--12px);
		font-variant-numeric: tabular-nums;
	}

	.area {
		fill: var(--color-fg);
		opacity: 0.4;
	}

	.line {
		fill: none;
		stroke: var(--color-fg);
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.cluster-name-small {
		font-size: var(--18px);
	}

	.small .chart-title {
		margin-top: 0;
		margin-bottom: -2rem;
		text-align: center;
	}
</style>
