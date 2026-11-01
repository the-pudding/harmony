<script lang="ts">
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import ChangedRowCard from "./ChangedRowCard.svelte";
	import {
		formatMetricDelta,
		formatMetricValue,
		formatPercentChangeLabel
	} from "./formatChange.js";
	import reportJson from "./matchingChangeReport.json";
	import type { MatchingChangeReport } from "./matchingChangeReport.js";

	const report = reportJson as MatchingChangeReport;
</script>

<svelte:head>
	<title>harmony — matching changes</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
	/>
</svelte:head>

<div class="page" style="--top-nav-height: {TOP_NAV_HEIGHT};">
	<TopNavBar showSearch={false} />

	<div class="content">
		<div class="page-header">
			<h1 class="page-title">Matching changes</h1>
			<p class="page-description">
				Roman numerals now match exactly (same chords on the same degrees
				relative to the tonic), so relative-key spellings no longer count; cores
				can opt out with <code>matchRomanNumeralsExactly: false</code>.
			</p>
		</div>

		<section class="section">
			<h2 class="section-title">Headline metrics</h2>
			<table class="metrics">
				<thead>
					<tr>
						<th>Metric</th>
						<th>Before</th>
						<th>After</th>
						<th>Change</th>
						<th>% change</th>
					</tr>
				</thead>
				<tbody>
					{#each report.headline as metric (metric.label)}
						<tr>
							<td class="metric-label">{metric.label}</td>
							<td>{formatMetricValue(metric.before, metric.unit)}</td>
							<td>{formatMetricValue(metric.after, metric.unit)}</td>
							<td>{formatMetricDelta(metric)}</td>
							<td>{formatPercentChangeLabel(metric.before, metric.after)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>

		<section class="section">
			<h2 class="section-title">Top changed core progressions</h2>
			<ul class="rows">
				{#each report.cores as row (row.name)}
					<ChangedRowCard {row} variant="core" />
				{/each}
			</ul>
		</section>

		<section class="section">
			<h2 class="section-title">Top changed clusters</h2>
			<ul class="rows">
				{#each report.clusters as row (row.name)}
					<ChangedRowCard {row} variant="cluster" />
				{/each}
			</ul>
		</section>

		{#if report.relativeCores.length > 0}
			<section class="section">
				<h2 class="section-title">Kept on relative matching</h2>
				<p class="page-description">
					These cores set <code>matchRomanNumeralsExactly: false</code>, so they
					still match their shape on any degree. Counts are songs matching
					exactly → songs matching with the opt-out; examples are songs it
					retains.
				</p>
				<ul class="rows">
					{#each report.relativeCores as row (row.name)}
						<ChangedRowCard {row} variant="core" />
					{/each}
				</ul>
			</section>
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
		padding: 1.5rem 12px 2rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
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

	.page-description {
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.5;
		color: #a1a1aa;
	}

	.page-description code {
		color: #d4d4d8;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.section-title {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #e4e4e7;
	}

	.metrics {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.75rem;
	}

	.metrics th,
	.metrics td {
		padding: 0.375rem 0.75rem;
		text-align: right;
		border-bottom: 1px solid rgba(63, 63, 70, 0.7);
	}

	.metrics th {
		color: #71717a;
		font-weight: 500;
	}

	.metrics th:first-child,
	.metrics td:first-child {
		text-align: left;
	}

	.metric-label {
		color: #e4e4e7;
	}

	.rows {
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
</style>
