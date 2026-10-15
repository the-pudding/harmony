<script lang="ts">
	import type { Snippet } from "svelte";
	import { createAllSongsCoverageState } from "../../define-chord-progression/compute-coverage-of-all-songs/createAllSongsCoverageState.svelte.js";
	import ToggleSwitch from "../../../../chord-search-demo/ToggleSwitch.svelte";
	import { tonalityOfScale, type KeyTonality } from "./diatonicChords.js";
	import {
		DEFAULT_PROGRESSION_FILTERS,
		ROW_HEIGHT,
		TOP_PROGRESSIONS_LIMIT,
		rankProgressions,
		selectTopProgressions,
		type ProgressionFilters,
		type ProgressionToken
	} from "./topProgressions.js";

	type ChordRendererArgs = {
		tokens: ProgressionToken[];
		tonality: KeyTonality;
	};

	type Props = {
		chordRenderer: Snippet<[ChordRendererArgs]>;
		filterable?: boolean;
	};

	let { chordRenderer, filterable = true }: Props = $props();

	const coverage = createAllSongsCoverageState();

	let filters = $state<ProgressionFilters>(DEFAULT_PROGRESSION_FILTERS);

	const rankedProgressions = $derived(
		coverage.allSongsCoverageResult
			? rankProgressions(coverage.allSongsCoverageResult.songCoverages)
			: []
	);
	const topProgressions = $derived(
		selectTopProgressions(rankedProgressions, filters)
	);
</script>

<section class="top-progressions">
	<h4 class="title">Top {TOP_PROGRESSIONS_LIMIT} matched progressions</h4>
	{#if filterable}
		<div class="filters">
			<ToggleSwitch
				checked={filters.requiresMinorChord}
				onchange={(requiresMinorChord) =>
					(filters = { ...filters, requiresMinorChord })}
				label="Must include at least one minor chord"
			/>
			<ToggleSwitch
				checked={filters.requiresMinorKey}
				onchange={(requiresMinorKey) =>
					(filters = { ...filters, requiresMinorKey })}
				label="Is in a minor key"
			/>
		</div>
	{/if}
	{#if coverage.loadError}
		<p class="status">{coverage.loadError}</p>
	{:else if !coverage.allSongsCoverageResult}
		<p class="status">Matching progressions across the corpus…</p>
	{:else if topProgressions.length === 0}
		<p class="status">No progressions match these filters.</p>
	{:else}
		<ol class="list" style:--row-height="{ROW_HEIGHT}px">
			{#each topProgressions as progression (progression.name)}
				<li class="item">
					<ul class="variants">
						{#each progression.variants as variant (variant.spelling)}
							{@const tonality = tonalityOfScale(progression.scale)}
							<li class="variant">
								{@render chordRenderer({ tokens: variant.tokens, tonality })}
								<span class="variant-count"
									>{progression.variants.length > 1
										? variant.songCount.toLocaleString()
										: ""}</span
								>
							</li>
						{/each}
					</ul>
					<div class="details">
						<span class="name">{progression.label}</span>
						<span class="count"
							>{progression.songCount.toLocaleString()} songs</span
						>
					</div>
				</li>
			{/each}
		</ol>
	{/if}
</section>

<style>
	.top-progressions {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		width: fit-content;
		max-width: 100%;
		min-width: 0;
		padding: 0.5rem;
		border-radius: 0.375rem;
		box-shadow: 0 0 6px rgb(0 0 0 / 0.12);
	}

	.title {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 600;
		color: #52525b;
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
	}

	.status {
		margin: 0;
		font-size: 0.75rem;
		color: #71717a;
	}

	.list {
		display: grid;
		grid-template-columns: max-content minmax(0, max-content);
		justify-content: start;
		gap: 0.125rem 0.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 0.75rem;
	}

	.item {
		display: grid;
		grid-column: 1 / -1;
		grid-template-columns: subgrid;
		align-items: start;
		color: #71717a;
	}

	.variants {
		display: grid;
		grid-template-columns: max-content auto;
		align-items: center;
		column-gap: 0.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.variant {
		display: contents;
	}

	.variant-count {
		text-align: left;
		color: #71717a;
		font-variant-numeric: tabular-nums;
	}

	.details {
		display: flex;
		flex-direction: column;
		justify-content: center;
		min-height: var(--row-height);
		min-width: 0;
	}

	.name {
		color: #18181b;
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.count {
		color: #71717a;
	}
</style>
