<script lang="ts">
	import MostCommonSequencesChart from "./MostCommonSequencesChart.svelte";
	import { buildSearchAbstract } from "./buildSearchAbstract.js";
	import { chordSearchDemoStore } from "./chordSearchDemoStore.svelte.js";
	import {
		SEQUENCE_CHART_EMPTY_MESSAGE,
		SEQUENCE_CHART_LOADING_MESSAGE,
		SEQUENCE_CHART_TITLE,
		sequenceChartEffectiveMinLength,
		sequenceChartMinLengthSubtitle
	} from "./constants.js";

	const searchChords = $derived(chordSearchDemoStore.searchChords);
	const fuzzySearch = $derived(chordSearchDemoStore.fuzzySearch);
	const ignoreSlashBassNotes = $derived(
		chordSearchDemoStore.ignoreSlashBassNotes
	);
	const matchAtBeginningOnly = $derived(
		chordSearchDemoStore.matchAtBeginningOnly
	);
	const matchAtLeastTwice = $derived(chordSearchDemoStore.matchAtLeastTwice);
	const effectiveMinLength = $derived(
		sequenceChartEffectiveMinLength(
			chordSearchDemoStore.minNumChordsToCountAsAProgression,
			searchChords.length
		)
	);
	const chartData = $derived(
		chordSearchDemoStore.sequenceChartData.filter(
			(row) => row.length >= effectiveMinLength
		)
	);
	const chartStatus = $derived(chordSearchDemoStore.sequenceChartStatus);
	const chartError = $derived(chordSearchDemoStore.sequenceChartError);
	const searchAbstract = $derived(
		buildSearchAbstract(searchChords, { ignoreSlashBassNotes, fuzzySearch })
	);
	const hasSearchChords = $derived(searchChords.length > 0);
	const chartSubtitle = $derived(
		sequenceChartMinLengthSubtitle(effectiveMinLength)
	);
	const isLoading = $derived(chartStatus === "loading");
	const hasData = $derived(chartData.length > 0);
	const showEmpty = $derived(chartStatus === "ready" && !hasData);
	const showChart = $derived(hasData);
</script>

<section class="chart-section">
	<div class="chart-heading">
		<h2 class="chart-title">{SEQUENCE_CHART_TITLE}</h2>
		<p class="chart-subtitle">{chartSubtitle}</p>
	</div>

	{#if chartError}
		<p class="error">{chartError}</p>
	{/if}

	{#if isLoading && !showChart}
		<p class="status">{SEQUENCE_CHART_LOADING_MESSAGE}</p>
	{:else if showEmpty}
		<p class="empty">{SEQUENCE_CHART_EMPTY_MESSAGE}</p>
	{:else if showChart}
		<MostCommonSequencesChart
			{chartData}
			{isLoading}
			{hasSearchChords}
			{searchAbstract}
			{fuzzySearch}
			{matchAtBeginningOnly}
			{matchAtLeastTwice}
		/>
	{/if}
</section>

<style>
	.chart-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		min-width: 0;
	}

	.chart-heading {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.chart-title {
		font-size: 1.75rem;
		font-weight: 600;
		line-height: 1.2;
		color: #f4f4f5;
		margin: 0;
		letter-spacing: -0.02em;
	}

	.chart-subtitle {
		font-size: 0.875rem;
		font-weight: 400;
		color: #71717a;
		margin: 0;
		line-height: 1.4;
	}

	.status,
	.empty {
		font-size: 0.875rem;
		color: #71717a;
		margin: 0;
	}

	.error {
		font-size: 0.875rem;
		color: #fca5a5;
		margin: 0;
	}
</style>
