<script lang="ts">
	import { handCorrectedSongs } from "$data/hand-corrected-songs.js";
	import {
		getChordProgressionIssues,
		isSongLooksGoodAsIs,
		LOOKS_GOOD_EMOJI,
		LOOKS_GOOD_LABEL,
		getChordMatchingChallenges,
		TRICKY_TO_MATCH_EMOJI
	} from "$data/hand-reviewed-songs.js";
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import SongIdentityLabel from "../../shared/SongIdentityLabel.svelte";

	const HAND_CORRECTED_TITLE = "hand corrected";
	const HAND_CORRECTED_EMOJI = "✏️";
	const PROBLEMATIC_EMOJI = "🔴";
	const HAND_CORRECTED_SONG_IDS = new Set(
		handCorrectedSongs.map((song) => song.id)
	);

	type Props = {
		song: GroupedSong;
	};

	let { song }: Props = $props();

	const isHandCorrected = $derived(
		HAND_CORRECTED_SONG_IDS.has(song.songKey)
	);
	const chordProgressionIssues = $derived(
		getChordProgressionIssues(song.songKey)
	);
	const isProblematic = $derived(chordProgressionIssues !== undefined);
	const looksGoodAsIs = $derived(isSongLooksGoodAsIs(song.songKey));
	const chordMatchingChallenges = $derived(getChordMatchingChallenges(song.songKey));
</script>

<div class="song-title-row">
	<SongIdentityLabel
		title={song.title}
		artists={song.artists}
		year={song.year}
		source={song.source}
		showSource={!isHandCorrected}
	>
		{#snippet beforeSource()}
			{#if isHandCorrected}
				<span
					class="status-icon"
					title={HAND_CORRECTED_TITLE}
					aria-label={HAND_CORRECTED_TITLE}>{HAND_CORRECTED_EMOJI}</span
				>
			{/if}
		{/snippet}
		{#snippet afterYoutube()}
			{#if isProblematic}
				<span
					class="status-icon status-icon-problematic"
					title={chordProgressionIssues}
					aria-label={chordProgressionIssues}>{PROBLEMATIC_EMOJI}</span
				>
			{/if}
			{#if chordMatchingChallenges}
				<span
					class="status-icon status-icon-tricky"
					title={chordMatchingChallenges}
					aria-label={chordMatchingChallenges}>{TRICKY_TO_MATCH_EMOJI}</span
				>
			{/if}
			{#if looksGoodAsIs}
				<span
					class="status-icon status-icon-looks-good"
					title={LOOKS_GOOD_LABEL}
					aria-label={LOOKS_GOOD_LABEL}>{LOOKS_GOOD_EMOJI}</span
				>
			{/if}
		{/snippet}
		{#snippet trailing()}
			<span class="artist">— {song.artists.join(", ")}</span>
			{#if song.keyLabel}
				<span class="key-label">· {song.keyLabel}</span>
			{/if}
		{/snippet}
	</SongIdentityLabel>
</div>

<style>
	.song-title-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.125rem;
	}

	.status-icon {
		font-size: 0.625rem;
		line-height: 1;
		opacity: 0.55;
		cursor: default;
		align-self: center;
	}

	.status-icon-problematic {
		opacity: 0.85;
	}

	.status-icon-tricky {
		opacity: 0.8;
	}

	.status-icon-looks-good {
		opacity: 0.75;
	}

	.artist,
	.key-label {
		color: #71717a;
	}
</style>
