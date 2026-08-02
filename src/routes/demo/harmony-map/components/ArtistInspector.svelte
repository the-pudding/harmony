<script lang="ts">
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import ArtistProfile from "../../shared/artists/ArtistProfile.svelte";
	import ArtistSearch from "../../shared/artists/ArtistSearch.svelte";
	import type { ArtistSummary } from "../../shared/artists/artistStats.js";
	import {
		ARTISTS_PAGE_PATH,
		buildArtistsPageUrl
	} from "../../shared/artists/artistsPagePath.js";

	const TOP_ARTIST_PREVIEW_COUNT = 25;
	const PROGRESSION_LIMIT = 6;
	const TIMELINE_MAX_HEIGHT = 120;

	type Props = {
		summaries: ArtistSummary[];
		selectedSummary: ArtistSummary | null;
		songByKey: Map<string, GroupedSong>;
		selectedSongKey: string | null;
		onSelectArtist: (artistName: string | null) => void;
		onSelectSong: (songKey: string) => void;
	};

	const {
		summaries,
		selectedSummary,
		songByKey,
		selectedSongKey,
		onSelectArtist,
		onSelectSong
	}: Props = $props();

	const topArtists = $derived(summaries.slice(0, TOP_ARTIST_PREVIEW_COUNT));
</script>

<div class="artist-inspector">
	<ArtistSearch
		{summaries}
		selectedArtistName={selectedSummary?.artistName ?? null}
		onSelect={onSelectArtist}
	/>

	{#if selectedSummary === null}
		<p class="hint">
			Pick an artist to filter the map to their songs. Full breakdowns for every
			artist live on the
			<a href={ARTISTS_PAGE_PATH}>artists page</a>.
		</p>

		<section class="section">
			<h3 class="section-title">most songs in corpus</h3>
			<ul class="artist-list">
				{#each topArtists as summary (summary.artistName)}
					<li>
						<button
							class="artist-row"
							onclick={() => onSelectArtist(summary.artistName)}
						>
							<span class="artist-name">{summary.artistName}</span>
							<span class="artist-count">{summary.songCount}</span>
						</button>
					</li>
				{/each}
			</ul>
		</section>
	{:else}
		<div class="selected-header">
			<span class="selected-name">{selectedSummary.artistName}</span>
			<a
				class="page-link"
				href={buildArtistsPageUrl(selectedSummary.artistName)}
				>open on artists page</a
			>
		</div>

		<ArtistProfile
			summary={selectedSummary}
			{songByKey}
			{selectedSongKey}
			progressionLimit={PROGRESSION_LIMIT}
			timelineMaxHeight={TIMELINE_MAX_HEIGHT}
			timelineTooltipVariant="compact"
			{onSelectSong}
		/>

		<section class="section">
			<h3 class="section-title">songs ({selectedSummary.songCount})</h3>
			<ul class="song-list">
				{#each selectedSummary.songs as song (song.songKey)}
					<li>
						<button
							class="song-row"
							class:song-row-selected={song.songKey === selectedSongKey}
							onclick={() => onSelectSong(song.songKey)}
						>
							<span class="song-title">{song.title}</span>
							<span class="song-year">{song.year ?? "—"}</span>
						</button>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>

<style>
	.artist-inspector {
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		height: 100%;
		overflow-y: auto;
		padding: 0.875rem;
		box-sizing: border-box;
		background: rgba(24, 24, 27, 0.55);
		border: 1px solid rgba(63, 63, 70, 0.7);
		border-radius: 0.5rem;
		font-size: 0.75rem;
		color: #d4d4d8;
	}

	.hint {
		margin: 0;
		color: #71717a;
		line-height: 1.5;
	}

	.hint a,
	.page-link {
		color: rgba(129, 140, 248, 0.9);
		text-decoration: none;
	}

	.hint a:hover,
	.page-link:hover {
		text-decoration: underline;
	}

	.selected-header {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.selected-name {
		font-weight: 600;
		color: #f4f4f5;
	}

	.page-link {
		font-size: 0.65rem;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		border-top: 1px solid rgba(63, 63, 70, 0.7);
		padding-top: 0.625rem;
	}

	.section-title {
		margin: 0;
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}

	.artist-list,
	.song-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.artist-row,
	.song-row {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		padding: 0.25rem 0.375rem;
		border: none;
		border-radius: 0.25rem;
		background: rgba(63, 63, 70, 0.25);
		color: #d4d4d8;
		font-family: inherit;
		font-size: 0.7rem;
		text-align: left;
		cursor: pointer;
	}

	.artist-row:hover,
	.song-row:hover,
	.song-row-selected {
		background: rgba(99, 102, 241, 0.25);
		color: #f4f4f5;
	}

	.artist-count,
	.song-year {
		color: #71717a;
		flex-shrink: 0;
	}
</style>
