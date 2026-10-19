<script lang="ts">
	import {
		romanTokenForChord,
		type MusicalKey
	} from "../../../chord-processing/chordInKey.js";
	import { formatChordName } from "../../../chord-processing/formatChordDisplay.js";
	import type { ChordSheetSection } from "./chordSheet.js";

	type Props = {
		sections: ChordSheetSection[];
		musicalKey: MusicalKey;
	};

	let { sections, musicalKey }: Props = $props();
</script>

<section class="sheet" aria-label="Chord sheet">
	<span class="heading"
		>Chord sheet <span class="note"
			>from the corpus · section order may not match the recording</span
		></span
	>
	{#if sections.length === 0}
		<p class="empty">The corpus has no chords for this song.</p>
	{:else}
		<dl>
			{#each sections as section, index (index)}
				<dt>{section.labels.join(" · ")}</dt>
				<dd>
					{#each section.chords as chord, chordIndex (chordIndex)}
						<span class="chord"
							>{formatChordName(chord)}<span class="roman"
								>{romanTokenForChord(chord, musicalKey)}</span
							></span
						>
					{/each}
				</dd>
			{/each}
		</dl>
	{/if}
</section>

<style>
	.sheet {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 14rem;
		overflow-y: auto;
		padding: 0.5rem 0.75rem;
		border: 1px solid rgba(63, 63, 70, 0.9);
		border-radius: 0.5rem;
		background: rgba(24, 24, 27, 0.6);
		font-size: 0.75rem;
	}

	.heading {
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #71717a;
	}

	.note {
		text-transform: none;
		letter-spacing: normal;
	}

	dl {
		display: grid;
		grid-template-columns: minmax(6rem, max-content) 1fr;
		gap: 0.375rem 1rem;
		margin: 0;
	}

	dt {
		color: #a1a1aa;
		font-size: 0.6875rem;
		padding-top: 0.125rem;
	}

	dd {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin: 0;
	}

	.chord {
		display: inline-flex;
		align-items: baseline;
		gap: 0.25rem;
		padding: 0.0625rem 0.375rem;
		border-radius: 0.25rem;
		background: rgba(63, 63, 70, 0.6);
		color: #f4f4f5;
		font-weight: 600;
	}

	.roman {
		color: #a5b4fc;
		font-size: 0.625rem;
		font-weight: 400;
	}

	.empty {
		margin: 0;
		color: #a1a1aa;
	}

	@media (max-width: 40rem) {
		dl {
			grid-template-columns: 1fr;
		}
	}
</style>
