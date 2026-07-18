<script lang="ts">
	import { SONG_DATA_SOURCE_TITLE } from "../../../../chord-search-demo/constants.js";
	import { buildYouTubeSearchUrl } from "../../../../chord-search-demo/youtubeSearch.js";
	import {
		getChordProgressionIssues,
		isSongLooksGoodAsIs,
		LOOKS_GOOD_EMOJI,
		LOOKS_GOOD_LABEL,
		manuallyEnteredSongs
	} from "$data/hand-reviewed-songs.js";
	import type { GroupedSong } from "../../../../data/songBrowser.js";

	const MANUALLY_CORRECTED_TITLE = "manually corrected";
	const MANUALLY_CORRECTED_EMOJI = "✏️";
	const PROBLEMATIC_EMOJI = "🔴";
	const MANUALLY_ENTERED_SONG_IDS = new Set(
		manuallyEnteredSongs.map((song) => song.id)
	);

	type Props = {
		song: GroupedSong;
	};

	let { song }: Props = $props();

	const youtubeSearchUrl = $derived(
		buildYouTubeSearchUrl({
			title: song.title,
			artists: song.artists,
			year: song.year
		})
	);
	const source = $derived(song.source);
	const sourceTitle = $derived(
		source ? SONG_DATA_SOURCE_TITLE[source] : undefined
	);
	const isManuallyCorrected = $derived(
		MANUALLY_ENTERED_SONG_IDS.has(song.songKey)
	);
	const chordProgressionIssues = $derived(
		getChordProgressionIssues(song.songKey)
	);
	const isProblematic = $derived(chordProgressionIssues !== undefined);
	const looksGoodAsIs = $derived(isSongLooksGoodAsIs(song.songKey));
</script>

<div class="song-title-row">
	{#if isManuallyCorrected}
		<span
			class="status-icon"
			title={MANUALLY_CORRECTED_TITLE}
			aria-label={MANUALLY_CORRECTED_TITLE}>{MANUALLY_CORRECTED_EMOJI}</span
		>
	{:else if source}
		<span class="source" title={sourceTitle}>{source}</span>
	{/if}
	<a
		class="youtube-search"
		href={youtubeSearchUrl}
		target="_blank"
		rel="noopener noreferrer"
		aria-label="Search on YouTube"
		title="Search on YouTube">🎵</a
	>
	{#if isProblematic}
		<span
			class="status-icon status-icon-problematic"
			title={chordProgressionIssues}
			aria-label={chordProgressionIssues}>{PROBLEMATIC_EMOJI}</span
		>
	{/if}
	{#if looksGoodAsIs}
		<span
			class="status-icon status-icon-looks-good"
			title={LOOKS_GOOD_LABEL}
			aria-label={LOOKS_GOOD_LABEL}>{LOOKS_GOOD_EMOJI}</span
		>
	{/if}
	<span class="song-name">{song.title}</span>
	{#if song.year !== undefined}
		<span class="year">({song.year})</span>
	{/if}
	<span class="artist">— {song.artists.join(", ")}</span>
	{#if song.keyLabel}
		<span class="key-label">· {song.keyLabel}</span>
	{/if}
</div>

<style>
	.song-title-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.125rem;
	}

	.source {
		font-size: 0.5625rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: #52525b;
		line-height: 1;
	}

	.youtube-search {
		font-size: 0.625rem;
		line-height: 1;
		text-decoration: none;
		opacity: 0.55;
		transition: opacity 0.15s;
	}

	.youtube-search:hover {
		opacity: 1;
	}

	.status-icon {
		font-size: 0.625rem;
		line-height: 1;
		opacity: 0.55;
		cursor: default;
	}

	.status-icon-problematic {
		opacity: 0.85;
	}

	.status-icon-looks-good {
		opacity: 0.75;
	}

	.song-name {
		color: #fff;
		font-weight: 500;
	}

	.year,
	.artist,
	.key-label {
		color: #71717a;
	}
</style>
