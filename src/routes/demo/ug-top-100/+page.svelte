<script lang="ts">
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import { progressionGroupLegendItems } from "$data/core-progressions.js";
	import { openDefineChordProgressionSong } from "../shared/defineChordProgressionSongUrl.js";
	import ArtistSongTimeline from "../shared/artists/ArtistSongTimeline.svelte";
	import ProgressionFamilyBreakdown from "../shared/ProgressionFamilyBreakdown.svelte";
	import ChordCoveragePanel from "./ChordCoveragePanel.svelte";
	import { createPopularUgState } from "./createPopularUgState.svelte.js";
	import { createBillboardTop10State } from "./createBillboardTop10State.svelte.js";

	const ugTop100 = createPopularUgState();
	const billboardTop10 = createBillboardTop10State();

	let selectedSongKey = $state<string | null>(null);

	const yearDomain = $derived.by(() => {
		const years = ugTop100.songs.flatMap((song) =>
			song.year === null ? [] : [song.year]
		);
		return years.length === 0
			? null
			: { min: Math.min(...years), max: Math.max(...years) };
	});

	const selectSong = (songKey: string) => {
		selectedSongKey = songKey;
		openDefineChordProgressionSong(songKey);
	};
</script>

<svelte:head>
	<title>harmony — ug top 100</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
	/>
</svelte:head>

<div class="page" style="--top-nav-height: {TOP_NAV_HEIGHT};">
	<TopNavBar showSearch={false} />

	<div class="content">
		<div class="page-header">
			<h1 class="page-title">UG top 100</h1>
			<p class="page-subtitle">
				The 100 most popular Ultimate Guitar chord charts, colored by core
				progression family.
			</p>
		</div>

		{#if ugTop100.loading}
			<p class="status">Loading songs…</p>
		{:else if ugTop100.error}
			<p class="status error">{ugTop100.error}</p>
		{:else}
			<section class="panel">
				<div class="panel-title-row">
					<h4 class="panel-title">songs over time</h4>
					<span class="song-count"
						>{ugTop100.songs.length.toLocaleString()} songs</span
					>
				</div>
				<ArtistSongTimeline
					songs={ugTop100.songs}
					songByKey={ugTop100.songByKey}
					{yearDomain}
					{selectedSongKey}
					onSelectSong={selectSong}
				/>
				<div class="legend">
					{#each progressionGroupLegendItems as item (item.label)}
						<span class="legend-item">
							<span class="legend-dot" style:background={item.color}></span>
							{item.label}
						</span>
					{/each}
				</div>
			</section>

			<section class="panel">
				<h4 class="panel-title">core progression family breakdown</h4>
				<ProgressionFamilyBreakdown songCoverages={ugTop100.coverageEntries} />
			</section>

			<ChordCoveragePanel
				title="chords needed to play 90% of these songs"
				groupedSongs={ugTop100.groupedSongs}
				loading={ugTop100.loading}
				error={ugTop100.error}
			/>

			<ChordCoveragePanel
				title="chords needed to play 90% of Billboard top 10 songs"
				groupedSongs={billboardTop10.groupedSongs}
				loading={billboardTop10.loading}
				error={billboardTop10.error}
			/>
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
		gap: 1.5rem;
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
		font-size: 0.8125rem;
		color: #71717a;
		line-height: 1.5;
	}

	.status {
		font-size: 0.8125rem;
		color: #71717a;
	}

	.status.error {
		color: #fca5a5;
	}

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

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.875rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.6875rem;
		color: #a1a1aa;
	}

	.legend-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		flex-shrink: 0;
	}
</style>
