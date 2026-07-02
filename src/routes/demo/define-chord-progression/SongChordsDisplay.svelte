<script lang="ts">
	import type { GroupedSong } from "../progressions/songBrowser.js";
	import {
		buildChordHighlightSegments,
		getSectionMatches
	} from "./progressionMatchAnalysis.js";

	type Props = {
		song: GroupedSong;
		chordProgression?: string | null;
		showMetadata?: boolean;
	};

	let { song, chordProgression = null, showMetadata = false }: Props = $props();
</script>

<div class="song-chords">
	{#if showMetadata}
		<div class="song-title-row">
			<span class="song-name">{song.title}</span>
			{#if song.year !== undefined}
				<span class="year">({song.year})</span>
			{/if}
			<span class="artist">— {song.artists.join(", ")}</span>
			{#if song.keyLabel}
				<span class="key-label">· {song.keyLabel}</span>
			{/if}
		</div>
	{/if}
	<div class="sections">
		{#each song.sections as section, sectionIndex (sectionIndex)}
			{@const matches = getSectionMatches(section, chordProgression)}
			{@const segments = buildChordHighlightSegments(section, matches)}
			<div class="section-row">
				{#if section.label}
					<span class="section-label">{section.label}</span>
				{/if}
				<div class="chords">
					{#each segments as segment, segmentIndex (segmentIndex)}
						{#if segment.matchIndex !== -1}
							<span class="match-group">
								{#each segment.indices as position, positionIndex (position)}
									<span class="chord highlighted">
										{section.romanTokens[position]}
									</span>
									{#if positionIndex < segment.indices.length - 1}
										<span class="dot">·</span>
									{/if}
								{/each}
							</span>
						{:else}
							{#each segment.indices as position, positionIndex (position)}
								<span class="chord">{section.romanTokens[position]}</span>
								{#if positionIndex < segment.indices.length - 1}
									<span class="dot">·</span>
								{/if}
							{/each}
						{/if}
						{#if segmentIndex < segments.length - 1}
							<span class="dot">·</span>
						{/if}
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.song-chords {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		min-width: 0;
		max-width: 100%;
		overflow: hidden;
	}

	.song-title-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.25rem;
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
