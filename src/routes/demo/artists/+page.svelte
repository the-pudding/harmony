<script lang="ts">
	import { TOP_NAV_HEIGHT } from "../../../chord-search-demo/constants.js";
	import SongCorpusFilterToggles from "../../../chord-search-demo/SongCorpusFilterToggles.svelte";
	import TopNavBar from "../../../chord-search-demo/top-nav-bar/TopNavBar.svelte";
	import { onMount } from "svelte";
	import { createAllSongsCoverageState } from "../define-chord-progression/compute-coverage-of-all-songs/createAllSongsCoverageState.svelte.js";
	import { currentSearchParams } from "../shared/currentSearchParams.js";
	import { openDefineChordProgressionSong } from "../shared/defineChordProgressionSongUrl.js";
	import ArtistSearch from "../shared/artists/ArtistSearch.svelte";
	import {
		buildArtistSummaries,
		yearDomainFor
	} from "../shared/artists/artistStats.js";
	import {
		artistCatalogSlugByName,
		fetchArtistCatalogManifest,
		type ArtistCatalogManifestEntry
	} from "../shared/artists/artistCatalogManifest.js";
	import {
		readFocusedArtistFromUrl,
		replaceFocusedArtistInUrl
	} from "../shared/artists/artistsPagePath.js";
	import ArtistSection from "./ArtistSection.svelte";

	const TOP_ARTIST_COUNT = 50;

	const coverage = createAllSongsCoverageState();

	let focusedArtistName = $state(
		readFocusedArtistFromUrl(currentSearchParams())
	);
	let catalogManifest = $state<ArtistCatalogManifestEntry[]>([]);

	onMount(() => {
		fetchArtistCatalogManifest().then((manifest) => {
			catalogManifest = manifest;
		});
	});

	const catalogSlugByArtistName = $derived(
		artistCatalogSlugByName(catalogManifest)
	);
	let pinnedProgression = $state<string | null>(null);
	let selectedSongKey = $state<string | null>(null);

	const songByKey = $derived(
		new Map(coverage.baseList.map((song) => [song.songKey, song]))
	);

	const artistSummaries = $derived(
		buildArtistSummaries(
			coverage.allSongsCoverageResult?.songCoverages ?? [],
			songByKey
		)
	);

	const topArtists = $derived(artistSummaries.slice(0, TOP_ARTIST_COUNT));

	const shownArtists = $derived(
		focusedArtistName === null
			? topArtists
			: artistSummaries.filter(
					(summary) => summary.artistName === focusedArtistName
				)
	);

	const yearDomain = $derived(yearDomainFor(topArtists));

	const rankOf = (artistName: string): number =>
		artistSummaries.findIndex((summary) => summary.artistName === artistName) +
		1;

	const focusArtist = (artistName: string | null) => {
		focusedArtistName = artistName;
		replaceFocusedArtistInUrl(artistName);
	};

	const togglePinnedProgression = (chordProgression: string) => {
		pinnedProgression =
			pinnedProgression === chordProgression ? null : chordProgression;
	};

	const selectSong = (songKey: string) => {
		selectedSongKey = songKey;
		openDefineChordProgressionSong(songKey);
	};
</script>

<svelte:head>
	<title>harmony — artists</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
	/>
</svelte:head>

<div class="page" style="--top-nav-height: {TOP_NAV_HEIGHT};">
	<TopNavBar showSearch={false} />

	<div class="content">
		<div class="page-header">
			<h1 class="page-title">Artists</h1>
			<p class="page-subtitle">
				The {TOP_ARTIST_COUNT} artists with the most songs in the corpus, with the
				core progressions they lean on and when their songs came out.
			</p>
		</div>

		<div class="controls">
			<div class="search-slot">
				<ArtistSearch
					summaries={artistSummaries}
					selectedArtistName={focusedArtistName}
					onSelect={focusArtist}
					placeholder="Search any artist…"
				/>
			</div>

			<SongCorpusFilterToggles
				showRecentOnly={coverage.showRecentOnly}
				onRecentChange={coverage.handleRecentToggleChange}
			/>

			{#if coverage.loading}
				<span class="status-text">Loading song dataset…</span>
			{:else if coverage.loadingFullSongs}
				<span class="status-text">Loading full song dataset…</span>
			{:else if coverage.loadError}
				<span class="status-text error">{coverage.loadError}</span>
			{:else if coverage.allSongsCoverageResult === null}
				<span class="status-text">Computing coverage…</span>
			{:else}
				<span class="status-text">
					{artistSummaries.length.toLocaleString()} artists across
					{coverage.baseList.length.toLocaleString()} songs
				</span>
			{/if}
		</div>

		{#if pinnedProgression !== null}
			<button class="pin-chip" onclick={() => (pinnedProgression = null)}>
				highlighting {pinnedProgression}
				<span class="chip-clear" aria-hidden="true">✕</span>
			</button>
		{/if}

		{#if shownArtists.length === 0}
			<p class="empty">
				{coverage.allSongsCoverageResult === null
					? "Crunching progression coverage for every song…"
					: "No artist matches that search."}
			</p>
		{:else}
			<div class="artists">
				{#each shownArtists as summary (summary.artistName)}
					<ArtistSection
						rank={rankOf(summary.artistName)}
						{summary}
						{songByKey}
						{yearDomain}
						{pinnedProgression}
						{selectedSongKey}
						onSelectProgression={togglePinnedProgression}
						onSelectSong={selectSong}
						catalogSlug={catalogSlugByArtistName.get(summary.artistName) ?? null}
					/>
				{/each}
			</div>
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

	.controls {
		display: flex;
		align-items: flex-start;
		gap: 1.25rem;
		flex-wrap: wrap;
	}

	.search-slot {
		position: relative;
		width: 22rem;
		max-width: 100%;
	}

	.status-text {
		font-size: 0.75rem;
		color: #71717a;
		padding-top: 0.4375rem;
	}

	.status-text.error {
		color: #fca5a5;
	}

	.pin-chip {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-family: inherit;
		font-size: 0.7rem;
		color: #e4e4e7;
		padding: 0.1875rem 0.5rem;
		border-radius: 9999px;
		border: 1px solid rgba(99, 102, 241, 0.5);
		background: rgba(99, 102, 241, 0.18);
		cursor: pointer;
	}

	.pin-chip:hover {
		background: rgba(99, 102, 241, 0.3);
	}

	.chip-clear {
		color: #a1a1aa;
		font-size: 0.6rem;
	}

	.empty {
		margin: 0;
		font-size: 0.8125rem;
		color: #71717a;
	}

	.artists {
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
	}
</style>
