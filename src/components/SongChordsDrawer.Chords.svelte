<script lang="ts">
	// A song's chords, section by section, drawn as watercolor <Chord>s. Runs of
	// chords that match a progression are boxed, bordered in that progression's
	// map color (as in the drawer's share bar); dashed when the match is only
	// part of the progression.
	import Chord from "$components/Chord.svelte";
	import type { GroupedSong } from "$data/songBrowser.js";
	import { mapColors } from "$runes/mapColors.svelte.js";
	import { formatRomanTokenFromParsed } from "../chord-processing/romanNumerals.js";
	import {
		buildColoredHighlightSegments,
		type ChordAnnotation
	} from "$routes/demo/define-chord-progression/progression-matching-logic/progressionMatchAnalysis.js";

	type Section = GroupedSong["sections"][number];

	type Props = {
		song: GroupedSong;
		annotations: ChordAnnotation[];
	};

	const { song, annotations }: Props = $props();

	// Per-section key labels only appear when the key varies across sections.
	const showPerSectionKeys = $derived(
		new Set(
			song.sections
				.map((section) => section.keyLabel)
				.filter((label) => label !== null)
		).size > 1
	);

	const romanAt = (section: Section, position: number) =>
		formatRomanTokenFromParsed(
			section.romanTokens[position],
			section.parsedProgression[position]
		);

	const tonalityOf = (section: Section) =>
		section.scale === "minor" ? "minor" : "major";

	const borderColorOf = (
		segment: ReturnType<typeof buildColoredHighlightSegments>[number]
	) =>
		(segment.chordProgression &&
			mapColors.byProgression.get(segment.chordProgression)) ??
		segment.palette?.border;
</script>

<div class="sections">
	{#each song.sections as section, sectionIndex (sectionIndex)}
		{@const segments = buildColoredHighlightSegments(
			section,
			sectionIndex,
			annotations
		)}
		{@const tonality = tonalityOf(section)}
		<div class="label">
			{#if section.label}<span>{section.label}</span>{/if}
			{#if showPerSectionKeys && section.keyLabel}
				<span class="key">{section.keyLabel}</span>
			{/if}
		</div>
		<div class="chords">
			{#each segments as segment, segmentIndex (segmentIndex)}
				{#if segment.palette !== null}
					<span
						class="group"
						class:dashed={segment.isStrictSubset}
						style:--group-color={borderColorOf(segment)}
						title={segment.chordProgression}
					>
						{#each segment.indices as position (position)}
							<span class="chord">
								<Chord chord={romanAt(section, position)} {tonality} />
							</span>
						{/each}
					</span>
				{:else}
					{#each segment.indices as position (position)}
						<span class="chord unmatched">
							<Chord chord={romanAt(section, position)} {tonality} />
						</span>
					{/each}
				{/if}
			{/each}
		</div>
	{/each}
</div>

<style>
	.sections {
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr);
		column-gap: 0.375rem;
		row-gap: 0.5rem;
		align-items: center;
		font-size: 0.75rem;
	}

	.label {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		font-size: 0.5625rem;
		font-weight: 500;
		text-transform: lowercase;
		letter-spacing: 0.02em;
		color: #71717a;
		white-space: nowrap;
	}

	.key {
		font-size: 0.5rem;
		color: #52525b;
	}

	.chords {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem;
		min-width: 0;
	}

	.group {
		display: inline-flex;
		align-items: center;
		border: 1.5px solid var(--group-color);
		border-radius: 0.5rem;
		padding: 0.125rem 0.25rem;
	}

	.group.dashed {
		border-style: dashed;
	}

	.chord {
		display: inline-flex;
	}

	/* overlap neighbours slightly, like the story's inline chord runs */
	.chord :global(svg) {
		width: 2.5em;
		height: 2.5em;
		margin: -0.375em -0.35em;
		mix-blend-mode: normal;
	}

	.unmatched {
		opacity: 0.45;
	}
</style>
