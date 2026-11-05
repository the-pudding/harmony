<script>
	import { area, curveMonotoneX, extent, line, max, scaleLinear } from "d3";
	import ChevronLeft from "@lucide/svelte/icons/chevron-left";
	import ChevronRight from "@lucide/svelte/icons/chevron-right";
	import { Tween } from "svelte/motion";
	import { cubicInOut } from "svelte/easing";
	import Chord from "$components/Chord.svelte";
	import { CHORD_SIZE } from "$routes/demo/design/chord-viz/watercolor.js";
	import progressionsData from "$data/charts/top-progressions.csv";
	import {
		isDecadeByYearFile,
		keyFromByYearFile,
		slugFromByYearFile
	} from "$utils/clusterChartFile";

	// focus: the decade label to show ("2020s", "1950s-60s", …); defaults to the newest
	let { focus = null } = $props();

	const files = Object.entries(
		import.meta.glob("$data/charts/*_by_year.csv", {
			eager: true,
			import: "default"
		})
	);

	const toSlide = (label, filePath, rows) => {
		const slug = slugFromByYearFile(filePath);
		const progression = progressionsData.find(
			(d) => d.name.replace(/[()]/g, "").trim().replace(/\s+/g, "-") === slug
		);
		return {
			label,
			name: progression?.name ?? slug,
			chords: progression?.chordProgression.split("-") ?? [],
			scale: progression?.scale ?? "major",
			rows: rows.map((d) => ({ year: +d.year, percent: +d.percent }))
		};
	};

	// each decade's signature, newest first
	const slides = files
		.filter(([filePath]) => isDecadeByYearFile(filePath))
		.map(([filePath, rows]) =>
			toSlide(keyFromByYearFile(filePath), filePath, rows)
		)
		.sort((a, b) => b.label.localeCompare(a.label));

	// every file covers the same years, so slides can tween point by point
	const years = slides[0]?.rows.map((d) => d.year) ?? [];

	// one y axis for every slide
	const yMax = max(slides.flatMap((s) => s.rows.map((d) => d.percent))) ?? 0;

	// chords use the global `span.chords[data-chords]` spacing (as in Player),
	// which sizes them at 2.5em; this font size keeps them at their full size
	const CHORD_FONT_SIZE = CHORD_SIZE / 2.5;

	// the years a decade label covers: "1990s" → 1990–2000, "1950s-60s" → 1950–1970
	const decadeSpan = (label) => {
		const start = +label.slice(0, 4);
		const end = label.includes("-")
			? Math.floor(start / 100) * 100 + +label.match(/-(\d{2})s/)[1] + 10
			: start + 10;
		return [start, end];
	};

	const indexOf = (label) => {
		const i = slides.findIndex((s) => s.label === label);
		return i === -1 ? 0 : i;
	};

	// follows `focus` (the tweens below animate the move); the arrows override
	// it until `focus` changes again
	let index = $derived(indexOf(focus));
	const slide = $derived(slides[index]);

	const highlight = Tween.of(() => (slide ? decadeSpan(slide.label) : [0, 0]), {
		duration: 700,
		easing: cubicInOut
	});

	const percents = Tween.of(() => slide?.rows.map((d) => d.percent) ?? [], {
		duration: 700,
		easing: cubicInOut
	});

	// same size as the full ClusterPercentOverTime chart on the previous slide
	const margin = { top: 16, right: 16, bottom: 32, left: 40 };
	const height = 240;
	let width = $state(0);

	const x = $derived(
		scaleLinear()
			.domain(extent(years))
			.range([margin.left, width - margin.right])
	);
	const y = scaleLinear()
		.domain([0, yMax])
		.nice()
		.range([height - margin.bottom, margin.top]);

	// clamped to the data's years, since the corpus starts partway through 1958
	const highlightX = $derived.by(() => {
		const [first, last] = extent(years);
		const [start, end] = highlight.current;
		const x1 = x(Math.max(first, start));
		const x2 = x(Math.min(last, end));
		return { x: x1, width: Math.max(0, x2 - x1) };
	});

	const points = $derived(
		years.map((year, i) => ({ year, percent: percents.current[i] ?? 0 }))
	);
	const linePath = $derived(
		line()
			.curve(curveMonotoneX)
			.x((d) => x(d.year))
			.y((d) => y(d.percent))(points)
	);
	const areaPath = $derived(
		area()
			.curve(curveMonotoneX)
			.x((d) => x(d.year))
			.y0(y(0))
			.y1((d) => y(d.percent))(points)
	);
</script>

{#if slide}
	<figure class="signatures" bind:clientWidth={width}>
		<div class="header">
			<button
				class="arrow"
				aria-label="Previous decade"
				disabled={index === 0}
				onclick={() => index--}
				><ChevronLeft aria-hidden="true" color="#fff" strokeWidth="2" /></button
			>
			<div class="label" aria-live="polite">
				<div class="decade">{slide.label}</div>
				<strong class="progression">{slide.name}</strong>
				<span
					class="chords"
					data-chords={slide.chords.join("-")}
					style:font-size="{CHORD_FONT_SIZE}px"
				>
					{#each slide.chords as chord, i (`${index}-${i}`)}
						<Chord {chord} tonality={slide.scale} />
					{/each}
				</span>
			</div>
			<button
				class="arrow"
				aria-label="Next decade"
				disabled={index === slides.length - 1}
				onclick={() => index++}
				><ChevronRight
					aria-hidden="true"
					color="#fff"
					strokeWidth="2"
				/></button
			>
		</div>

		{#if width}
			<svg {width} {height}>
				<rect
					class="highlight"
					x={highlightX.x}
					width={highlightX.width}
					y={margin.top}
					height={height - margin.top - margin.bottom}
				/>
				{#each y.ticks(4) as tick (tick)}
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
				<path class="line" d={linePath} />
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

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.label {
		flex: 1;
		text-align: center;
	}

	.decade {
		font-family: var(--font-mono);
		font-size: var(--14px);
		letter-spacing: 0.08em;
		text-transform: lowercase;
		opacity: 0.6;
	}

	.progression {
		font-size: var(--24px);
	}

	.chords {
		display: block;
		margin-top: 0.75em;
	}

	.highlight {
		fill: var(--color-fg);
		opacity: 0.06;
	}

	/* matches the story's Tap arrows over the hex map */
	.arrow {
		flex: none;
		display: flex;
		padding: 0;
		background: none;
		border: none;
		border-radius: 0;
		box-shadow: none;
		outline: none;
		cursor: pointer;
		font-size: 48px;
		line-height: 1;
		opacity: 0.5;
	}

	.arrow:disabled {
		opacity: 0.1;
		cursor: not-allowed;
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
</style>
