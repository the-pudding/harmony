<script lang="ts">
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import { createAllSongsCoverageState } from "../define-chord-progression/compute-coverage-of-all-songs/createAllSongsCoverageState.svelte.js";
	import DecadeLineChart from "../history/DecadeLineChart.svelte";
	import {
		buildHomogeneityBandShares,
		MOST_DIVERSE_BAND,
		MOST_HOMOGENEOUS_BAND,
		type HomogeneityBandId
	} from "../shared/progressionHomogeneity.js";
	import DecadeHomogeneityTable from "./DecadeHomogeneityTable.svelte";
	import DecadeStackedBarChart from "./DecadeStackedBarChart.svelte";
	import EffectiveCountExplainer from "./EffectiveCountExplainer.svelte";
	import HorizontalBarChart from "./HorizontalBarChart.svelte";
	import PageSection from "./PageSection.svelte";
	import RecipeProgressionTable from "./RecipeProgressionTable.svelte";
	import SongHomogeneityTable from "./SongHomogeneityTable.svelte";
	import StatCard from "./StatCard.svelte";
	import {
		buildDominantShareHistogram,
		buildRecipeProgressionRows,
		buildSongHomogeneityRows,
		computeHomogeneityHistory,
		EXAMPLE_MIN_COVERAGE_PERCENT,
		pickBandExamples,
		pickMostDiverseSongs,
		summarizeHomogeneity
	} from "./homogeneityAnalysis.js";
	import {
		describeMedianTrend,
		toBandBars,
		toDecadeStacks,
		toDominantShareBars,
		toDominantShareSeries,
		toEffectiveCountSeries
	} from "./homogeneityChartData.js";
	import { formatEffectiveCount, formatPercent } from "./homogeneityFormat.js";

	const EXAMPLES_PER_BAND = 4;
	const RECIPE_PROGRESSION_LIMIT = 12;
	const RECIPE_EXAMPLES_PER_PROGRESSION = 2;
	const MOST_DIVERSE_SONG_COUNT = 8;

	const coverage = createAllSongsCoverageState();

	const songByKey = $derived(new Map(coverage.baseList.map((song) => [song.songKey, song])));

	const rows = $derived(
		coverage.allSongsCoverageResult
			? buildSongHomogeneityRows(coverage.allSongsCoverageResult.songCoverages, songByKey)
			: []
	);

	const summary = $derived(summarizeHomogeneity(rows));
	const bandShares = $derived(
		buildHomogeneityBandShares(rows.map((row) => row.effectiveProgressionCount))
	);
	const shareOfBand = (bandId: HomogeneityBandId): number =>
		bandShares.find((share) => share.band.id === bandId)?.sharePercent ?? 0;

	const bandBars = $derived(toBandBars(bandShares));
	const dominantShareBars = $derived(toDominantShareBars(buildDominantShareHistogram(rows)));
	const bandExamples = $derived(pickBandExamples(rows, EXAMPLES_PER_BAND));
	const recipeRows = $derived(
		buildRecipeProgressionRows(
			rows,
			MOST_HOMOGENEOUS_BAND.id,
			RECIPE_PROGRESSION_LIMIT,
			RECIPE_EXAMPLES_PER_PROGRESSION
		)
	);
	const mostDiverseSongs = $derived(pickMostDiverseSongs(rows, MOST_DIVERSE_SONG_COUNT));

	const history = $derived(computeHomogeneityHistory(rows));
	const decadeStacks = $derived(toDecadeStacks(history));
	const effectiveCountSeries = $derived(toEffectiveCountSeries(history));
	const dominantShareSeries = $derived(toDominantShareSeries(history));
	const trendDescription = $derived(describeMedianTrend(history));

	const statusText = $derived.by(() => {
		if (coverage.loading) return "Loading song dataset…";
		if (coverage.loadError) return coverage.loadError;
		if (!coverage.allSongsCoverageResult) return "Computing coverage…";
		return `${rows.length.toLocaleString()} songs with at least one matched progression`;
	});
</script>

<svelte:head>
	<title>harmony — homogeneity</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
	/>
</svelte:head>

<div class="page" style:--top-nav-height={TOP_NAV_HEIGHT}>
	<TopNavBar showSearch={false} />

	<div class="content">
		<div class="page-header">
			<h1 class="page-title">Homogeneity</h1>
			<p class="page-subtitle">Is a song one chord progression on repeat, or a recipe of many?</p>
			<span class="status-text" class:error={Boolean(coverage.loadError)}>{statusText}</span>
		</div>

		{#if rows.length > 0}
			<PageSection title="Measuring homogeneity">
				<EffectiveCountExplainer />
				<div class="stat-grid">
					<StatCard
						label="Median song"
						value={formatEffectiveCount(summary.medianEffectiveCount)}
						caption="effective progressions (mean {formatEffectiveCount(
							summary.meanEffectiveCount
						)}, pulled up by a long diverse tail)"
					/>
					<StatCard
						label="Top progression"
						value={formatPercent(summary.medianDominantSharePercent)}
						caption="of a median song's matched chords come from its single most-used progression"
					/>
					<StatCard
						label="Essentially one loop"
						value={formatPercent(shareOfBand(MOST_HOMOGENEOUS_BAND.id))}
						caption="of songs score under {MOST_HOMOGENEOUS_BAND.upperBound} effective progressions"
						accentColor={MOST_HOMOGENEOUS_BAND.color}
					/>
					<StatCard
						label="A real recipe"
						value={formatPercent(shareOfBand(MOST_DIVERSE_BAND.id))}
						caption="of songs behave like {MOST_DIVERSE_BAND.shortLabel} equally-used progressions"
						accentColor={MOST_DIVERSE_BAND.color}
					/>
				</div>
			</PageSection>

			<PageSection
				title="How homogeneous are songs?"
				description="Neither extreme dominates: the corpus spreads across every band, with a sizeable single-loop minority and an even larger group of genuinely multi-progression songs. The top-progression histogram is bimodal — most songs give their biggest progression 20–50% of their chords, but there's a distinct spike at 90–100%: songs that are one progression start to finish."
			>
				<div class="wide-chart-grid">
					<HorizontalBarChart
						title="Songs by effective progression count"
						description="Each song's effective progression count, bucketed. Colors match the harmony map's “effective progressions” color mode."
						bars={bandBars}
					/>
					<HorizontalBarChart
						title="Share of a song taken by its top progression"
						description="How much of a song's matched chords its single most-used progression accounts for."
						bars={dominantShareBars}
					/>
				</div>
			</PageSection>

			<PageSection
				title="What each band looks like"
				description="Representative songs from each band, favoring top-10 hits where at least {EXAMPLE_MIN_COVERAGE_PERCENT}% of the chords were matched (so the recipe isn't mostly unexplained). The recipe bar shows every matched progression's share of the song, largest first — hover a segment for its name."
			>
				{#each bandExamples as { band, songs } (band.id)}
					<div class="band-examples">
						<h3 class="band-title">
							<span class="band-swatch" style:background={band.color}></span>
							{band.label}
						</h3>
						<SongHomogeneityTable rows={songs} />
					</div>
				{/each}
			</PageSection>

			<PageSection
				title="Single-loop songs: which loop?"
				description="Among songs in the {MOST_HOMOGENEOUS_BAND.label} band, the progression that makes up (nearly) the whole song. Even the most common loop accounts for only a small slice of single-loop songs — they're harmonically homogeneous internally, but spread across many different progressions, so on the harmony map they form many tight islands rather than one big blob."
			>
				<RecipeProgressionTable rows={recipeRows} />
			</PageSection>

			<PageSection
				title="The most diverse songs"
				description="The highest effective progression counts among well-matched songs. Medleys, long album tracks, and through-composed songs dominate — there's no single loop to speak of, and every progression is a brief appearance."
			>
				<SongHomogeneityTable rows={mostDiverseSongs} />
			</PageSection>

			<PageSection
				title="Has it changed over time?"
				description="Yes, dramatically. {trendDescription} The 1960s–80s were the era of verse/chorus/bridge songwriting with distinct progressions per section; from the 2000s on, loop-based production collapses many songs to one or two progressions for their whole length."
			>
				<DecadeStackedBarChart
					title="Songs by effective progression count, per decade"
					description="Each column sums to 100% of that decade's matched songs. Decades need at least 20 songs to appear."
					stacks={decadeStacks}
				/>
				<div class="line-chart-grid">
					<DecadeLineChart
						title="Effective vs. distinct progressions per song"
						description="Distinct counts every progression the matcher finds, however brief; effective discounts the brief ones. The gap between them is how much of a song's variety is passing detail."
						series={effectiveCountSeries}
						formatValue={formatEffectiveCount}
						yMaxBaseline={1}
					/>
					<DecadeLineChart
						title="Share of a song taken by its top progression"
						description="The average song's single most-used progression — the flip side of the same trend."
						series={dominantShareSeries}
					/>
				</div>
				<DecadeHomogeneityTable rows={history} />
			</PageSection>
		{/if}
	</div>
</div>

<style>
	:global(body > header) {
		display: none;
	}

	:global(body) {
		font-family: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
	}

	.page {
		background: #09090b;
		color: #f4f4f5;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		padding-top: var(--top-nav-height);
	}

	.content {
		padding: 1.5rem 12px 4rem;
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
		width: 100%;
		max-width: 80rem;
		margin: 0 auto;
		box-sizing: border-box;
	}

	.page-header {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.page-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
		color: #f4f4f5;
	}

	.page-subtitle {
		margin: 0;
		font-size: 0.8rem;
		color: #a1a1aa;
	}

	.status-text {
		font-size: 0.75rem;
		color: #71717a;
	}

	.status-text.error {
		color: #fca5a5;
	}

	.stat-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 1rem;
	}

	.wide-chart-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(24rem, 1fr));
		gap: 2rem;
	}

	.line-chart-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
		gap: 1.5rem;
	}

	.band-examples {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.band-title {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #d4d4d8;
	}

	.band-swatch {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 9999px;
	}
</style>
