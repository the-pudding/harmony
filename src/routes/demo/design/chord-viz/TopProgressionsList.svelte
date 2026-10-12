<script lang="ts">
	import { createAllSongsCoverageState } from "../../define-chord-progression/compute-coverage-of-all-songs/createAllSongsCoverageState.svelte.js";
	import ToggleSwitch from "../../../../chord-search-demo/ToggleSwitch.svelte";
	import ProgressionChords from "./ProgressionChords.svelte";
	import type { FloatingIds, FloatingSettings } from "./floatingEffects.js";
	import {
		DEFAULT_PROGRESSION_FILTERS,
		ROW_HEIGHT,
		TOP_PROGRESSIONS_LIMIT,
		rankProgressions,
		selectTopProgressions,
		type ProgressionFilters
	} from "./topProgressions.js";

	type Props = {
		settings: FloatingSettings;
		ids: FloatingIds;
	};

	let { settings, ids }: Props = $props();

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
					<div class="details">
						<span class="name">{progression.label}</span>
						<span class="count"
							>{progression.songCount.toLocaleString()} songs</span
						>
					</div>
					<ul class="variants">
						{#each progression.variants as variant (variant.spelling)}
							<li class="variant">
								<span class="variant-count"
									>{progression.variants.length > 1
										? variant.songCount.toLocaleString()
										: ""}</span
								>
								<ProgressionChords tokens={variant.tokens} {settings} {ids} />
							</li>
						{/each}
					</ul>
				</li>
			{/each}
		</ol>
	{/if}
</section>

<style>
	.top-progressions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
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
		gap: 0.5rem 1.5rem;
	}

	.status {
		margin: 0;
		font-size: 0.75rem;
		color: #71717a;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin: 0;
		padding: 0 0 0 1.75rem;
		font-size: 0.75rem;
	}

	.item {
		display: grid;
		grid-template-columns: 14rem auto;
		justify-content: start;
		align-items: start;
		gap: 1rem;
		color: #71717a;
	}

	.variants {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.variant {
		display: grid;
		grid-template-columns: 2.5rem auto;
		align-items: center;
		gap: 0.5rem;
	}

	.variant-count {
		text-align: right;
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
