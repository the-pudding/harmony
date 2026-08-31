<script lang="ts">
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import type { ChordAnnotation } from "../progression-matching-logic/progressionMatchAnalysis.js";
	import type { ChordHighlightPalette } from "./progressionColors.js";
	import type { ParsedProgressionChord } from "../../../../chord-processing/types.js";
	import { formatRomanTokenFromParsed } from "../../../../chord-processing/romanNumerals.js";
	import { buildColoredHighlightSegments } from "../progression-matching-logic/progressionMatchAnalysis.js";
	import { UNGROUPED_PROGRESSION_PALETTE } from "./progressionColors.js";

	const DIMMED_HIGHLIGHT_OPACITY = 0.22;

	const COMPACT_CHORDS_FONT_SIZE = "0.5625rem";
	const COMPACT_CHORD_PADDING = "0.0625rem 0.2rem";
	const COMPACT_MATCH_GROUP_PADDING = "0.1rem";
	const COMPACT_MATCH_GROUP_BORDER_RADIUS = "0.25rem";
	const COMPACT_SECTION_LABEL_FONT_SIZE = "0.5rem";
	const COMPACT_ROW_GAP = "0.15rem";
	const COMPACT_CHORD_GAP = "0.0625rem";

	type Props = {
		song: GroupedSong;
		parsedProgression?: ParsedProgressionChord[] | null;
		highlightPalette?: ChordHighlightPalette;
		isStrictSubset?: boolean;
		matchRomanNumeralsExactly?: boolean;
		annotations?: ChordAnnotation[];
		focusedProgression?: string | null;
		compact?: boolean;
	};

	let {
		song,
		parsedProgression = null,
		highlightPalette,
		isStrictSubset = false,
		matchRomanNumeralsExactly = false,
		annotations,
		focusedProgression = null,
		compact = false
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
							isStrictSubset,
							matchRomanNumeralsExactly
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
	class:compact
	style="--section-label-chord-gap: {SECTION_LABEL_CHORD_GAP_PX}px; --section-label-right-padding: {SECTION_LABEL_RIGHT_PADDING_PX}px; --dimmed-highlight-opacity: {DIMMED_HIGHLIGHT_OPACITY}; {compact ? `--compact-chords-font: ${COMPACT_CHORDS_FONT_SIZE}; --compact-chord-padding: ${COMPACT_CHORD_PADDING}; --compact-match-group-padding: ${COMPACT_MATCH_GROUP_PADDING}; --compact-match-group-radius: ${COMPACT_MATCH_GROUP_BORDER_RADIUS}; --compact-section-label-font: ${COMPACT_SECTION_LABEL_FONT_SIZE}; --compact-row-gap: ${COMPACT_ROW_GAP}; --compact-chord-gap: ${COMPACT_CHORD_GAP};` : ''}"
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

	.compact .sections {
		row-gap: var(--compact-row-gap);
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

	.compact .section-label {
		font-size: var(--compact-section-label-font);
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

	.compact .chords {
		font-size: var(--compact-chords-font);
		gap: var(--compact-chord-gap);
	}

	.chord {
		color: #a1a1aa;
		padding: 0.125rem 0.375rem;
	}

	.compact .chord {
		padding: var(--compact-chord-padding);
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

	.compact .match-group {
		padding: var(--compact-match-group-padding);
		border-radius: var(--compact-match-group-radius);
		gap: var(--compact-chord-gap);
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
