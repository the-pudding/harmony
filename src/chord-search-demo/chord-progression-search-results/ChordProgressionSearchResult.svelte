<script lang="ts">
	import { isPositionInMatch } from "../../chord-processing/match-chord-progressions/match.js";
	import type { GroupedSongSearchResult } from "../../chord-processing/types.js";
	import { SONG_DATA_SOURCE_TITLE } from "../constants.js";
	import { buildYouTubeSearchUrl } from "../youtubeSearch.js";

	let { result }: { result: GroupedSongSearchResult } = $props();

	const isMatched = $derived(
		result.sections.some((section) => section.matches.length > 0)
	);
	const youtubeSearchUrl = $derived(
		buildYouTubeSearchUrl({
			title: result.title,
			artists: result.artists,
			year: result.year
		})
	);
	const artistLabel = $derived(result.artists.join(", "));
	const source = $derived(result.source);
	const sourceTitle = $derived(
		source ? SONG_DATA_SOURCE_TITLE[source] : undefined
	);
</script>

<div class="card" class:matched={isMatched}>
	<div class="title">
		{#if source}
			<span class="source" title={sourceTitle}>{source}</span>
		{/if}
		<a
			class="youtube-search"
			href={youtubeSearchUrl}
			target="_blank"
			rel="noopener noreferrer"
			aria-label="Search on YouTube"
			title="Search on YouTube"
		>🎵</a>
		<span class="song-title">{result.title}</span>
		{#if result.year !== undefined}
			<span class="year"> ({result.year})</span>
		{/if}
		<span class="artist"> — {artistLabel}</span>
	</div>
	<div class="sections">
		{#each result.sections as section, sectionIndex (sectionIndex)}
			{@const sectionLength = section.parsedProgression.length}
			<div class="section-row">
				{#if section.sectionLabel}
					<span class="section-label">{section.sectionLabel}</span>
				{/if}
				<div class="chords">
					{#each section.parsedProgression as chord, position (position)}
						{@const highlighted = section.matches.some((match) =>
							isPositionInMatch(position, match, sectionLength)
						)}
						<span class="chord" class:highlighted>{chord.display}</span>
						{#if position < sectionLength - 1}
							<span class="dot">·</span>
						{/if}
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.card {
		padding: 0.625rem;
		border: 1px solid #27272a;
		border-radius: 0.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.card.matched {
		background: rgba(30, 27, 75, 0.2);
		border-color: rgba(49, 46, 129, 0.4);
	}

	.title {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.125rem;
	}

	.song-title {
		color: #fff;
		font-weight: 500;
	}

	.artist,
	.year {
		color: #71717a;
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

	.sections {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.section-row {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.section-label {
		flex-shrink: 0;
		font-size: 0.5625rem;
		font-weight: 500;
		text-transform: lowercase;
		letter-spacing: 0.02em;
		color: #52525b;
		min-width: 4.5rem;
	}

	.chords {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.125rem;
		font-size: 0.75rem;
	}

	.chord {
		color: #a1a1aa;
		padding: 0.125rem 0.375rem;
	}

	.chord.highlighted {
		background: #4338ca;
		color: #fff;
		border-radius: 0.25rem;
		font-weight: 500;
	}

	.dot {
		color: #3f3f46;
	}
</style>
