<script lang="ts">
	import GooeyChords from "./GooeyChords.svelte";
	import type { FloatingIds, FloatingSettings } from "./floatingEffects.js";
	import {
		ROW_CENTER_Y,
		ROW_CHORD_RADIUS,
		ROW_HEIGHT,
		rowChordCenterX,
		rowWidthFor,
		type ProgressionToken
	} from "./topProgressions.js";

	type Props = {
		tokens: ProgressionToken[];
		settings: FloatingSettings;
		ids: FloatingIds;
	};

	let { tokens, settings, ids }: Props = $props();

	const width = $derived(rowWidthFor(tokens.length));
	const gooeyChords = $derived(
		tokens.map((token, index) => ({
			id: `${index}-${token.roman}`,
			roman: token.roman,
			tone: token.tone,
			x: rowChordCenterX(index),
			y: ROW_CENTER_Y,
			radius: ROW_CHORD_RADIUS
		}))
	);
</script>

<svg
	class="progression"
	viewBox="0 0 {width} {ROW_HEIGHT}"
	style:--row-width="{width}px"
	style:--row-height="{ROW_HEIGHT}px"
	role="img"
	aria-label={tokens.map((token) => token.roman).join(" ")}
>
	<GooeyChords chords={gooeyChords} {settings} {ids} />
</svg>

<style>
	.progression {
		flex: none;
		width: var(--row-width);
		height: var(--row-height);
		--chord-label-size: 0.75rem;
	}
</style>
