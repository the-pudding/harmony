<script lang="ts">
	import type { GroupedSong } from "../../../data/songBrowser.js";
	import ToggleSwitch from "../../../chord-search-demo/ToggleSwitch.svelte";
	import ChordCoverageChart from "./ChordCoverageChart.svelte";
	import { analyzeChordCoverage } from "./chordCoverage.js";

	type Props = {
		title: string;
		groupedSongs: GroupedSong[];
		loading: boolean;
		error?: string | null;
	};

	const { title, groupedSongs, loading, error = null }: Props = $props();

	let allowCapo = $state(false);

	const chordCoverage = $derived(analyzeChordCoverage(groupedSongs, { allowCapo }));

	const chordsToLearn = $derived(
		chordCoverage.steps.filter((step) => step.chordCount <= chordCoverage.chordsForThreshold)
	);
</script>

<section class="panel">
	<div class="panel-title-row">
		<h4 class="panel-title">{title}</h4>
		{#if !loading && !error}
			<span class="song-count"
				>{chordCoverage.chordsForThreshold} of {chordCoverage.totalDistinctChordCount}
				distinct chords</span
			>
		{/if}
	</div>

	{#if loading}
		<p class="status">Loading songs…</p>
	{:else if error}
		<p class="status error">{error}</p>
	{:else}
		<div class="capo-toggle-row">
			<ToggleSwitch
				checked={allowCapo}
				onchange={(checked) => (allowCapo = checked)}
				label="allow capo"
			/>
			<span class="capo-toggle-note"
				>with a capo, a song's chords can shift down to whatever shape is
				easiest — a song in D can be played in C shapes with a capo on fret 2</span
			>
		</div>
		<p class="panel-note">
			Learning the {chordCoverage.chordsForThreshold} chords below (in this order)
			makes {chordCoverage.chordsForThreshold < chordCoverage.totalDistinctChordCount
				? "most"
				: "all"} of the {chordCoverage.totalSongCount} songs fully playable — every
			chord in a song has to be known for that song to count. Order is greedy: at
			each step, the chord that unlocks the most additional songs is learned next
			(a slash chord like "C / E" counts as its base chord, C{allowCapo
				? "; each song can use whichever capo position (up to fret 7) makes its chords match your known shapes"
				: ""}).
		</p>
		<ChordCoverageChart analysis={chordCoverage} />
		<ol class="chord-order-list">
			{#each chordsToLearn as step (step.chordCount)}
				<li class="chord-order-item">
					<span class="chord-order-index">{step.chordCount}</span>
					<span class="chord-order-name">{step.chord}</span>
					<span class="chord-order-gain">+{step.newlyCoveredSongCount} songs</span>
					<span class="chord-order-cumulative"
						>{Math.round(step.cumulativeCoveredPercent)}% total</span
					>
				</li>
			{/each}
		</ol>
	{/if}
</section>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.panel-title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.panel-title {
		margin: 0;
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}

	.song-count {
		font-size: 0.75rem;
		color: #71717a;
	}

	.status {
		font-size: 0.8125rem;
		color: #71717a;
	}

	.status.error {
		color: #fca5a5;
	}

	.panel-note {
		margin: 0;
		font-size: 0.75rem;
		color: #71717a;
		line-height: 1.5;
	}

	.capo-toggle-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.capo-toggle-note {
		font-size: 0.6875rem;
		color: #52525b;
		line-height: 1.4;
	}

	.chord-order-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
		gap: 0.375rem 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.chord-order-item {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		font-size: 0.75rem;
	}

	.chord-order-index {
		flex-shrink: 0;
		width: 1.25rem;
		color: #52525b;
		font-variant-numeric: tabular-nums;
	}

	.chord-order-name {
		flex-shrink: 0;
		min-width: 2.5rem;
		font-weight: 600;
		color: #f4f4f5;
	}

	.chord-order-gain {
		flex: 1;
		min-width: 0;
		color: #a1a1aa;
	}

	.chord-order-cumulative {
		flex-shrink: 0;
		color: #52525b;
		font-variant-numeric: tabular-nums;
	}
</style>
