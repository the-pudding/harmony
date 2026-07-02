<script lang="ts">
	import type { GroupedSong } from "../../progressions/songBrowser.js";
	import type { ChordAnnotation } from "../progression-matching-logic/progressionMatchAnalysis.js";
	import type { ChordHighlightPalette } from "./progressionColors.js";
	import { buildColoredHighlightSegments } from "../progression-matching-logic/progressionMatchAnalysis.js";
	import { DEFAULT_PROGRESSION_PALETTE } from "./progressionColors.js";

	type Props = {
		song: GroupedSong;
		chordProgression?: string | null;
		highlightPalette?: ChordHighlightPalette;
		annotations?: ChordAnnotation[];
		showMetadata?: boolean;
	};

	let {
		song,
		chordProgression = null,
		highlightPalette,
		annotations,
		showMetadata = false
	}: Props = $props();

	const SECTION_LABEL_CHORD_GAP_PX = 2;
	const SECTION_LABEL_RIGHT_PADDING_PX = 6;

	const effectiveAnnotations = $derived(
		annotations ??
			(chordProgression
				? [{ chordProgression, palette: highlightPalette ?? DEFAULT_PROGRESSION_PALETTE }]
				: [])
	);
</script>

<div
	class="song-chords"
	style="--section-label-chord-gap: {SECTION_LABEL_CHORD_GAP_PX}px; --section-label-right-padding: {SECTION_LABEL_RIGHT_PADDING_PX}px;"
>
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
			{@const segments = buildColoredHighlightSegments(section, effectiveAnnotations)}
			{#if section.label}
				<span class="section-label">{section.label}</span>
			{:else}
				<span class="section-label section-label-empty" aria-hidden="true"></span>
			{/if}
			<div class="chords">
				{#each segments as segment, segmentIndex (segmentIndex)}
					{#if segment.palette !== null}
						<span
							class="match-group"
							style:--highlight-fill={segment.palette.fill}
							style:--highlight-border={segment.palette.border}
						>
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
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr);
		column-gap: var(--section-label-chord-gap);
		row-gap: 0.25rem;
		align-items: baseline;
	}

	.section-label {
		font-size: 0.5625rem;
		font-weight: 500;
		text-transform: lowercase;
		letter-spacing: 0.02em;
		color: #52525b;
		white-space: nowrap;
		text-align: right;
		padding-right: var(--section-label-right-padding);
	}

	.section-label-empty {
		display: block;
	}

	.chords {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.125rem;
		font-size: 0.75rem;
		min-width: 0;
	}

	.chord {
		color: #a1a1aa;
		padding: 0.125rem 0.375rem;
	}

	.chord.highlighted {
		background: var(--highlight-fill);
		color: #fff;
		border-radius: 0.25rem;
		font-weight: 500;
	}

	.match-group {
		display: inline-flex;
		align-items: center;
		gap: 0.125rem;
		border: 1px solid var(--highlight-border);
		border-radius: 0.375rem;
		padding: 0.2rem;
	}

	.dot {
		color: #3f3f46;
	}
</style>
