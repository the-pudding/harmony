<script lang="ts">
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import type { ChordAnnotation } from "../progression-matching-logic/progressionMatchAnalysis.js";
	import type { ChordHighlightPalette } from "./progressionColors.js";
	import type { ParsedProgressionChord } from "../../../../chord-processing/types.js";
	import { formatRomanTokenFromParsed } from "../../../../chord-processing/romanNumerals.js";
	import { buildColoredHighlightSegments } from "../progression-matching-logic/progressionMatchAnalysis.js";
	import { UNGROUPED_PROGRESSION_PALETTE } from "./progressionColors.js";

	const DIMMED_HIGHLIGHT_OPACITY = 0.22;

	type Props = {
		song: GroupedSong;
		parsedProgression?: ParsedProgressionChord[] | null;
		highlightPalette?: ChordHighlightPalette;
		isStrictSubset?: boolean;
		annotations?: ChordAnnotation[];
		focusedProgression?: string | null;
	};

	let {
		song,
		parsedProgression = null,
		highlightPalette,
		isStrictSubset = false,
		annotations,
		focusedProgression = null
	}: Props = $props();

	const SECTION_LABEL_CHORD_GAP_PX = 2;
	const SECTION_LABEL_RIGHT_PADDING_PX = 6;

	const effectiveAnnotations = $derived(
		annotations ??
			(parsedProgression
				? [
						{
							parsedProgression,
							palette: highlightPalette ?? UNGROUPED_PROGRESSION_PALETTE,
							isStrictSubset
						}
					]
				: [])
	);

	// Per-section key labels only appear when the key actually varies across
	// sections; uniform-key songs show it once in the metadata line instead.
	const showPerSectionKeys = $derived(
		new Set(
			song.sections
				.map((section) => section.keyLabel)
				.filter((label) => label !== null)
		).size > 1
	);

	const sectionRomanToken = (
		section: GroupedSong["sections"][number],
		position: number
	): string =>
		formatRomanTokenFromParsed(
			section.romanTokens[position],
			section.parsedProgression[position]
		);
</script>

<div
	class="song-chords"
	style="--section-label-chord-gap: {SECTION_LABEL_CHORD_GAP_PX}px; --section-label-right-padding: {SECTION_LABEL_RIGHT_PADDING_PX}px; --dimmed-highlight-opacity: {DIMMED_HIGHLIGHT_OPACITY};"
>
	<div class="sections">
		{#each song.sections as section, sectionIndex (sectionIndex)}
			{@const segments = buildColoredHighlightSegments(
				section,
				sectionIndex,
				effectiveAnnotations
			)}
			{#if section.label || (showPerSectionKeys && section.keyLabel)}
				<div class="section-label-cell">
					{#if section.label}
						<span class="section-label">{section.label}</span>
					{/if}
					{#if showPerSectionKeys && section.keyLabel}
						<span class="section-key">{section.keyLabel}</span>
					{/if}
				</div>
			{:else}
				<span class="section-label section-label-empty" aria-hidden="true"
				></span>
			{/if}
			<div class="chords">
				{#each segments as segment, segmentIndex (segmentIndex)}
					{#if segment.palette !== null}
						<span
							class="match-group"
							class:dashed={segment.isStrictSubset}
							class:dimmed={focusedProgression !== null &&
								segment.chordProgression !== focusedProgression}
							style:--highlight-fill={segment.palette.fill}
							style:--highlight-border={segment.palette.border}
						>
							{#each segment.indices as position, positionIndex (position)}
								<span class="chord highlighted">
									{sectionRomanToken(section, position)}
								</span>
								{#if positionIndex < segment.indices.length - 1}
									<span class="dot">·</span>
								{/if}
							{/each}
						</span>
					{:else}
						{#each segment.indices as position, positionIndex (position)}
							<span class="chord">{sectionRomanToken(section, position)}</span>
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

	.sections {
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr);
		column-gap: var(--section-label-chord-gap);
		row-gap: 0.25rem;
		align-items: baseline;
	}

	.section-label-cell {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
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

	.section-key {
		font-size: 0.5rem;
		letter-spacing: 0.02em;
		color: #3f3f46;
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
		transition: opacity 0.15s ease;
	}

	.match-group.dimmed {
		opacity: var(--dimmed-highlight-opacity);
	}

	.match-group.dashed {
		border-style: dashed;
	}

	.dot {
		color: #3f3f46;
	}
</style>
