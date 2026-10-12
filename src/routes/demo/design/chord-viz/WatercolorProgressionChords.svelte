<script lang="ts">
	import type { KeyTonality } from "./diatonicChords.js";
	import {
		type ProgressionToken
	} from "./topProgressions.js";
	import { CHORD_OVERLAP_GAP, type WatercolorSettings } from "./watercolor.js";
	import WatercolorChord from "./WatercolorChord.svelte";

	type Props = {
		tokens: ProgressionToken[];
		tonality: KeyTonality;
		settings: WatercolorSettings;
	};

	let { tokens, tonality, settings }: Props = $props();

	const chords = $derived(
		tokens.map((token, index) => ({
			degree: index + 1,
			roman: token.roman,
			tone: token.tone,
			seed: index,
			tonality
		}))
	);
</script>

<div class="chords" style:--chord-gap="{CHORD_OVERLAP_GAP}px">
	{#each chords as chord (chord.degree)}
		<WatercolorChord {chord} {settings} />
	{/each}
</div>

<style>
	.chords {
		display: flex;
		flex-wrap: nowrap;
	}

	.chords > :global(* + *) {
		margin-left: var(--chord-gap);
	}
</style>
