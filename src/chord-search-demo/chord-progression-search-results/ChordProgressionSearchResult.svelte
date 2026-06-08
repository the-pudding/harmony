<script lang="ts">
	import { isPositionInMatch } from "../../chord-processing/match-chord-progressions/match.js";
	import type {
		GroupedSongSearchResult,
		SongSectionSearchResult
	} from "../../chord-processing/types.js";
	import { SONG_DATA_SOURCE_TITLE } from "../constants.js";
	import { buildYouTubeSearchUrl } from "../youtubeSearch.js";

	let { result }: { result: GroupedSongSearchResult } = $props();

	// matchIndex: the index into section.matches that owns this segment, or -1 for unmatched
	type Segment = { matchIndex: number; indices: number[] };

	function buildSegments(section: SongSectionSearchResult): Segment[] {
		const n = section.parsedProgression.length;

		// Assign each position to the first match that covers it (-1 = no match)
		const posToMatch = Array.from({ length: n }, (_, pos) =>
			section.matches.findIndex((match) => isPositionInMatch(pos, match, n))
		);

		// Group consecutive positions that share the same matchIndex
		const segments: Segment[] = [];
		for (let i = 0; i < n; i++) {
			const mi = posToMatch[i];
			const last = segments[segments.length - 1];
			if (last && last.matchIndex === mi) {
				last.indices.push(i);
			} else {
				segments.push({ matchIndex: mi, indices: [i] });
			}
		}
		return segments;
	}

	const totalMatchCount = $derived(
		result.sections.reduce((sum, s) => sum + s.matches.length, 0)
	);
	const isMatched = $derived(totalMatchCount > 0);
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
			title="Search on YouTube">🎵</a
		>
		<span class="song-title">{result.title}</span>
		{#if result.year !== undefined}
			<span class="year"> ({result.year})</span>
		{/if}
		{#if isMatched}
			<span
				class="match-count"
				title="{totalMatchCount} occurrence{totalMatchCount === 1 ? '' : 's'}"
			>
				×{totalMatchCount}
			</span>
		{/if}
		<span class="artist"> — {artistLabel}</span>
	</div>
	<div class="sections">
		{#each result.sections as section, sectionIndex (sectionIndex)}
			{@const segments = buildSegments(section)}
			<div class="section-row">
				{#if section.sectionLabel}
					<span class="section-label">{section.sectionLabel}</span>
				{/if}
				<div class="chords">
					{#each segments as segment, si}
						{#if segment.matchIndex !== -1}
							<span class="match-group">
								{#each segment.indices as pos, i}
									<span class="chord highlighted">
										{section.parsedProgression[pos].display}
									</span>
									{#if i < segment.indices.length - 1}
										<span class="dot">·</span>
									{/if}
								{/each}
							</span>
						{:else}
							{#each segment.indices as pos, i}
								<span class="chord"
									>{section.parsedProgression[pos].display}</span
								>
								{#if i < segment.indices.length - 1}
									<span class="dot">·</span>
								{/if}
							{/each}
						{/if}
						{#if si < segments.length - 1}
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

	.match-count {
		font-size: 0.625rem;
		font-weight: 600;
		color: #818cf8;
		background: rgba(99, 102, 241, 0.15);
		border: 1px solid rgba(99, 102, 241, 0.3);
		border-radius: 0.25rem;
		padding: 0.0625rem 0.3125rem;
		margin-left: 0.125rem;
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

	.match-group {
		display: inline-flex;
		align-items: center;
		gap: 0.125rem;
		border: 1px solid rgba(99, 102, 241, 0.55);
		border-radius: 0.375rem;
		padding: 0.2rem;
	}

	.dot {
		color: #3f3f46;
	}
</style>
