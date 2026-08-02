<script lang="ts">
	import type { Snippet } from "svelte";
	import { SONG_DATA_SOURCE_TITLE } from "../../../chord-search-demo/constants.js";
	import { buildYouTubeSearchUrl } from "../../../chord-search-demo/youtubeSearch.js";
	import type { SongDataSource } from "../../../chord-processing/types.js";
	import { buildDefineChordProgressionSongUrl } from "./defineChordProgressionSongUrl.js";

	type Props = {
		title: string;
		artists: string[];
		year?: number;
		source?: SongDataSource;
		songKey?: string;
		titleAsLink?: boolean;
		showSource?: boolean;
		beforeSource?: Snippet;
		afterYoutube?: Snippet;
		trailing?: Snippet;
	};

	const {
		title,
		artists,
		year,
		source,
		songKey,
		titleAsLink = false,
		showSource = true,
		beforeSource,
		afterYoutube,
		trailing
	}: Props = $props();

	const youtubeSearchUrl = $derived(
		buildYouTubeSearchUrl({ title, artists, year })
	);
	const sourceTitle = $derived(
		source ? SONG_DATA_SOURCE_TITLE[source] : undefined
	);
	const defineChordProgressionUrl = $derived(
		songKey !== undefined
			? buildDefineChordProgressionSongUrl(songKey)
			: undefined
	);
</script>

<span class="song-identity">
	{#if beforeSource}
		{@render beforeSource()}
	{/if}
	{#if showSource && source}
		<span class="source" title={sourceTitle}>{source}</span>
	{/if}
	<a
		class="youtube-search"
		href={youtubeSearchUrl}
		target="_blank"
		rel="noopener noreferrer"
		aria-label="Search on YouTube"
		title="Search on YouTube"
		onclick={(event) => event.stopPropagation()}>🎵</a
	>
	{#if afterYoutube}
		{@render afterYoutube()}
	{/if}
	{#if titleAsLink && defineChordProgressionUrl !== undefined}
		<a
			class="song-name song-name-link"
			href={defineChordProgressionUrl}
			target="_blank"
			rel="noopener noreferrer">{title}</a
		>
	{:else}
		<span class="song-name">{title}</span>
	{/if}
	{#if year !== undefined}
		<span class="year">({year})</span>
	{/if}
	{#if trailing}
		{@render trailing()}
	{/if}
</span>

<style>
	.song-identity {
		display: inline-flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.25rem;
		min-width: 0;
	}

	.source {
		font-size: 0.5625rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: #52525b;
		line-height: 1;
		align-self: center;
	}

	.youtube-search {
		font-size: 0.625rem;
		line-height: 1;
		text-decoration: none;
		opacity: 0.55;
		transition: opacity 0.15s;
		align-self: center;
	}

	.youtube-search:hover {
		opacity: 1;
	}

	.song-name {
		color: #f4f4f5;
		font-weight: 600;
	}

	.song-name-link {
		text-decoration: none;
	}

	.song-name-link:hover {
		text-decoration: underline;
		color: #fff;
	}

	.year {
		color: #71717a;
		font-weight: 400;
	}
</style>
