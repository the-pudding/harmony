<script lang="ts">
	import { chordSearchDemoStore } from "./chordSearchDemoStore.svelte.js";
	import {
		chordToRomanToken,
		computeNextChordData,
		countSongsWithSequence
	} from "./computeNextChordProbabilities.js";
	import MostLikelyNextChordChart from "./MostLikelyNextChordChart.svelte";

	const searchChords = $derived(chordSearchDemoStore.searchChords);
	const songs = $derived(chordSearchDemoStore.songs);

	const searchTokens = $derived(
		searchChords.map(chordToRomanToken).filter((t): t is string => t !== null)
	);

	const hasMappableChords = $derived(
		searchChords.length > 0 && searchTokens.length > 0
	);

	const hasUnmappableChords = $derived(
		searchChords.length > 0 && searchTokens.length === 0
	);

	const sankeyData = $derived(
		hasMappableChords && songs.length > 0
			? computeNextChordData(songs, searchTokens)
			: []
	);

	const corpusCount = $derived(
		sankeyData.length >= 2 ? sankeyData[1].totalCount : null
	);

	const pathStats = $derived(
		hasMappableChords && songs.length > 0
			? countSongsWithSequence(songs, searchTokens)
			: null
	);

	const subtitle = $derived.by(() => {
		if (songs.length === 0) return "Loading song dataset…";
		if (hasUnmappableChords)
			return "Chord not in C major scale — try a diatonic chord";
		if (!hasMappableChords)
			return "Add chords to the search bar to see the path";
		if (corpusCount === null) return "";
		return `Based on ${corpusCount.toLocaleString()} progression instances`;
	});

	let expanded = $state(true);
</script>

<section class="section">
	<button
		class="heading"
		onclick={() => (expanded = !expanded)}
		aria-expanded={expanded}
	>
		<div class="heading-text">
			<h2 class="title">Chord path likelihood</h2>
			<p class="subtitle">{subtitle}</p>
		</div>
		<svg
			class="chevron"
			class:chevron-collapsed={!expanded}
			width="16"
			height="16"
			viewBox="0 0 16 16"
			style:height="20px"
			style:width="20px"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M4 6l4 4 4-4"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</button>

	{#if expanded}
		{#if sankeyData.length > 0}
			<div class="chart-container">
				<MostLikelyNextChordChart layers={sankeyData} {pathStats} />
			</div>
		{:else if !hasMappableChords && songs.length > 0 && !hasUnmappableChords}
			<p class="idle">Play or type chords to see how likely your path is.</p>
		{/if}
	{/if}
</section>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		min-width: 0;
	}

	.heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
		width: 100%;
		color: inherit;
	}

	.heading:hover .title {
		color: #e4e4e7;
	}

	.heading:hover .chevron {
		color: #a1a1aa;
	}

	.heading-text {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.title {
		font-size: 1.75rem;
		font-weight: 600;
		line-height: 1.2;
		color: #f4f4f5;
		margin: 0;
		letter-spacing: -0.02em;
		transition: color 0.15s ease;
	}

	.subtitle {
		font-size: 0.875rem;
		font-weight: 400;
		color: #71717a;
		margin: 0;
		line-height: 1.4;
	}

	.chevron {
		color: #52525b;
		flex-shrink: 0;
		transition:
			transform 0.2s ease,
			color 0.15s ease;
	}

	.chevron-collapsed {
		transform: rotate(-90deg);
	}

	.chart-container {
		border: 1px solid rgba(39, 39, 42, 0.8);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.4);
		padding: 1rem;
		overflow: hidden;
	}

	.idle {
		font-size: 0.875rem;
		color: #71717a;
		margin: 0;
		font-style: italic;
	}
</style>
