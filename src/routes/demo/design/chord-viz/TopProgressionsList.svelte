<script lang="ts">
	import { createAllSongsCoverageState } from "../../define-chord-progression/compute-coverage-of-all-songs/createAllSongsCoverageState.svelte.js";
	import ProgressionChords from "./ProgressionChords.svelte";
	import type { FloatingIds, FloatingSettings } from "./floatingEffects.js";
	import {
		TOP_PROGRESSIONS_LIMIT,
		buildTopProgressions
	} from "./topProgressions.js";

	type Props = {
		settings: FloatingSettings;
		ids: FloatingIds;
	};

	let { settings, ids }: Props = $props();

	const coverage = createAllSongsCoverageState();

	const topProgressions = $derived(
		coverage.allSongsCoverageResult
			? buildTopProgressions(coverage.allSongsCoverageResult.songCoverages)
			: []
	);
</script>

<section class="top-progressions">
	<h4 class="title">Top {TOP_PROGRESSIONS_LIMIT} matched progressions</h4>
	{#if coverage.loadError}
		<p class="status">{coverage.loadError}</p>
	{:else if !coverage.allSongsCoverageResult}
		<p class="status">Matching progressions across the corpus…</p>
	{:else}
		<ol class="list">
			{#each topProgressions as progression (progression.name)}
				<li class="item">
					<div class="details">
						<span class="name">{progression.label}</span>
						<span class="count"
							>{progression.songCount.toLocaleString()} songs</span
						>
					</div>
					<ProgressionChords tokens={progression.tokens} {settings} {ids} />
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

	.status {
		margin: 0;
		font-size: 0.75rem;
		color: #71717a;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		max-height: 36rem;
		margin: 0;
		padding: 0 0 0 1.75rem;
		overflow-y: auto;
		font-size: 0.75rem;
	}

	.item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		color: #71717a;
	}

	.details {
		display: flex;
		flex-direction: column;
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
