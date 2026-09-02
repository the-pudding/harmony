<script lang="ts">
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import { createAllSongsCoverageState } from "../define-chord-progression/compute-coverage-of-all-songs/createAllSongsCoverageState.svelte.js";
	import { createEmbeddingState } from "../harmony-map/embedding/state/createEmbeddingState.svelte.js";
	import EmbeddingScatter from "../harmony-map/components/EmbeddingScatter.svelte";
	import { buildClusterInputPoints } from "../harmony-map/embedding/clustering/clusterInputPoints.js";
	import { findDensityClusters } from "../harmony-map/embedding/clustering/densityClusters.js";
	import { groupSharesForSong } from "../harmony-map/embedding/vectors/index.js";
	import type { ScatterPoint } from "../harmony-map/components/scatterPoint.js";
	import { songKeysMatchingGroupFilter } from "../shared/progressionGroupShare.js";
	import CorpusMatchRateOverTimeChart from "../core-progressions/CorpusMatchRateOverTimeChart.svelte";
	import type { YearDomain } from "../shared/artists/artistStats.js";
	import { storyBeats as STORY_BEATS } from "./storyBeats.js";

	const coverage = createAllSongsCoverageState();

	const embedding = createEmbeddingState({
		getEntries: () => coverage.allSongsCoverageResult?.songCoverages ?? null,
		getSongs: () => coverage.baseList,
		getCoverageCacheKey: () => coverage.coverageCacheKey,
		initialMethod: "groupBlend"
	});

	let beatIndex = $state(0);

	const beat = $derived(STORY_BEATS[beatIndex]);

	const songByKey = $derived(
		new Map(coverage.baseList.map((song) => [song.songKey, song]))
	);

	const songCoverages = $derived(
		coverage.allSongsCoverageResult?.songCoverages ?? []
	);

	const yearDomain = $derived.by((): YearDomain | null => {
		const years = coverage.baseList.flatMap((song) =>
			song.year === undefined ? [] : [song.year]
		);
		return years.length === 0
			? null
			: { min: Math.min(...years), max: Math.max(...years) };
	});

	const groupSharesBySongKey = $derived(
		new Map(
			songCoverages.map((entry) => [
				entry.songKey,
				groupSharesForSong(entry.progressionCounts)
			])
		)
	);

	const points = $derived.by((): ScatterPoint[] =>
		songCoverages.flatMap((entry) => {
			const coords = embedding.result.coordsByKey.get(entry.songKey);
			if (!coords) return [];
			return [
				{
					songKey: entry.songKey,
					x: coords.x,
					y: coords.y,
					groupShares: groupSharesBySongKey.get(entry.songKey) ?? []
				}
			];
		})
	);

	const clusterInputPoints = $derived(buildClusterInputPoints(points));
	const allClusters = $derived(findDensityClusters(clusterInputPoints));

	const highlightedSongKeyList = $derived.by((): string[] => {
		const value = beat.highlightSongKey;
		if (!value) return [];
		return Array.isArray(value) ? value : [value];
	});

	// EmbeddingScatter's enlarged "selected" dot only makes sense for one
	// song, so it only applies when a beat highlights exactly one.
	const selectedSongKey = $derived(
		highlightedSongKeyList.length === 1 ? highlightedSongKeyList[0] : null
	);

	const highlightedSongKeys = $derived(new Set(highlightedSongKeyList));

	// Not used for fading (see emphasizedSongKeys below) — kept only because
	// EmbeddingScatter requires the prop.
	const coClusterSongKeys = new Set<string>();

	const emphasizedClusterHashes = $derived.by((): Set<string> | null => {
		if (highlightedSongKeyList.length === 0) return null;
		return new Set(
			allClusters
				.filter((cluster) =>
					highlightedSongKeyList.some((songKey) =>
						cluster.songKeys.includes(songKey)
					)
				)
				.map((cluster) => cluster.hash)
		);
	});

	// Fades everything except: songs in the highlighted family, and the
	// union of every cluster containing any highlighted song (falling back
	// to just that song if it isn't in a cluster). Combines both when a beat
	// sets highlightFamily and highlightSongKey together.
	const emphasizedSongKeys = $derived.by((): Set<string> | null => {
		if (!beat.highlightFamily && highlightedSongKeyList.length === 0) {
			return null;
		}
		const combined = new Set<string>();
		if (beat.highlightFamily) {
			for (const songKey of songKeysMatchingGroupFilter(
				songCoverages,
				beat.highlightFamily,
				null
			)) {
				combined.add(songKey);
			}
		}
		for (const songKey of highlightedSongKeyList) {
			const memberClusters = allClusters.filter((cluster) =>
				cluster.songKeys.includes(songKey)
			);
			if (memberClusters.length === 0) {
				combined.add(songKey);
				continue;
			}
			for (const cluster of memberClusters) {
				for (const key of cluster.songKeys) combined.add(key);
			}
		}
		return combined;
	});

	const goToBeat = (index: number) => {
		beatIndex = Math.max(0, Math.min(STORY_BEATS.length - 1, index));
	};

	const beatParagraphs = $derived(
		Array.isArray(beat.text) ? beat.text : [beat.text]
	);
</script>

<svelte:head>
	<title>harmony — story</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
	/>
</svelte:head>

<div class="page" style="--top-nav-height: {TOP_NAV_HEIGHT};">
	<TopNavBar showSearch={false} />

	<div class="page-body">
		{#if coverage.allSongsCoverageResult}
			<EmbeddingScatter
				{points}
				{songByKey}
				{selectedSongKey}
				{coClusterSongKeys}
				{highlightedSongKeys}
				method={embedding.method}
				clusters={allClusters}
				{emphasizedClusterHashes}
				{emphasizedSongKeys}
				focusSongKey={beat.focusSongKey}
				focusClusterName={beat.focusCluster}
				showFamilyColors={beat.showFamilyColors ?? false}
				showClusterOutlines={beat.showClusterOutlines ?? false}
				onSelect={() => {}}
			/>
		{:else}
			<div class="loading-overlay">
				<span class="loading-text">
					{coverage.loading ? "Loading songs…" : "Computing coverage…"}
				</span>
			</div>
		{/if}
	</div>

	<div class="story-panel">
		{#if beat.media}
			<div class="story-media">
				{#if beat.media.title}
					<span class="story-media-title">{beat.media.title}</span>
				{/if}
				{#if beat.media.type === "youtube"}
					<div class="story-media-video">
						<iframe
							src="https://www.youtube.com/embed/{beat.media.videoId}"
							title={beat.media.title ?? "embedded video"}
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							allowfullscreen
						></iframe>
					</div>
				{:else if beat.media.type === "prevalenceChart"}
					<div class="story-media-chart">
						<CorpusMatchRateOverTimeChart
							corpusSongs={songCoverages}
							{songByKey}
							matchProgressions={beat.media.chordProgressions}
							filtered
							{yearDomain}
						/>
					</div>
				{/if}
			</div>
		{/if}

		<div class="story-beats">
			<div class="story-beat-text">
				{#each beatParagraphs as paragraph, index (index)}
					<p>{paragraph}</p>
				{/each}
			</div>
			<div class="story-beat-controls">
				<button
					class="story-nav-button"
					type="button"
					disabled={beatIndex === 0}
					onclick={() => goToBeat(beatIndex - 1)}
				>
					← prev
				</button>
				<div class="story-beat-dots">
					{#each STORY_BEATS as _, index (index)}
						<button
							class="story-beat-dot"
							class:story-beat-dot-active={index === beatIndex}
							type="button"
							aria-label="Go to beat {index + 1}"
							onclick={() => goToBeat(index)}
						></button>
					{/each}
				</div>
				<button
					class="story-nav-button"
					type="button"
					disabled={beatIndex === STORY_BEATS.length - 1}
					onclick={() => goToBeat(beatIndex + 1)}
				>
					next →
				</button>
			</div>
		</div>
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
		height: 100vh;
		display: flex;
		flex-direction: column;
		padding-top: var(--top-nav-height);
		overflow: hidden;
	}

	.page-body {
		flex: 1;
		min-height: 0;
		position: relative;
	}

	.loading-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.loading-text {
		font-size: 0.75rem;
		color: #52525b;
	}

	.story-panel {
		position: fixed;
		left: 50%;
		bottom: 2rem;
		transform: translateX(-50%);
		width: min(34rem, calc(100vw - 2rem));
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		z-index: 30;
	}

	.story-media {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		background: rgba(9, 9, 11, 0.92);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.75rem;
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(8px);
	}

	.story-media-title {
		font-size: 0.7rem;
		color: #a1a1aa;
		padding: 0 0.25rem;
	}

	.story-media-video {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.story-media-video iframe {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: none;
	}

	.story-media-chart {
		padding: 0.25rem 0.25rem 0;
	}

	.story-beats {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.25rem 1.5rem;
		background: rgba(9, 9, 11, 0.92);
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 0.75rem;
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(8px);
	}

	.story-beat-text {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		font-size: 0.85rem;
		line-height: 1.6;
		color: #e4e4e7;
		min-height: 3.4rem;
		max-height: 40vh;
		overflow-y: auto;
	}

	.story-beat-text p {
		margin: 0;
	}

	.story-beat-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.story-nav-button {
		flex-shrink: 0;
		font-family: inherit;
		font-size: 0.7rem;
		color: #a1a1aa;
		background: transparent;
		border: 1px solid rgba(63, 63, 70, 0.8);
		border-radius: 9999px;
		padding: 0.3rem 0.75rem;
		cursor: pointer;
	}

	.story-nav-button:hover:not(:disabled) {
		color: #e4e4e7;
		border-color: rgba(113, 113, 122, 0.9);
	}

	.story-nav-button:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.story-beat-dots {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.story-beat-dot {
		width: 0.5rem;
		height: 0.5rem;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: rgba(113, 113, 122, 0.5);
		cursor: pointer;
	}

	.story-beat-dot:hover {
		background: rgba(161, 161, 170, 0.8);
	}

	.story-beat-dot-active {
		background: #f4f4f5;
	}
</style>
