<script lang="ts">
	// The DOM twin of the hex map's canvas song labels: same lines, fonts and
	// colors, from songLabelText.ts.
	import {
		SONG_LABEL_FONT_FAMILY,
		SONG_LABEL_LINE_HEIGHT_PX,
		SONG_LABEL_STYLE,
		songLabelLines
	} from "./songLabelText.js";

	type Props = {
		title: string;
		year: number | undefined;
		artists: readonly string[];
	};

	const { title, year, artists }: Props = $props();

	const lines = $derived(songLabelLines({ title, year, artists }));
</script>

<div class="song-label">
	{#each lines as line}
		<div class="line" style:height="{SONG_LABEL_LINE_HEIGHT_PX}px">
			{#each line as { role, text }}
				{@const { fontWeight, fontSizePx, textMix } = SONG_LABEL_STYLE[role]}
				<span
					style:font-family={SONG_LABEL_FONT_FAMILY}
					style:font-weight={fontWeight}
					style:font-size="{fontSizePx}px"
					style:color={textMix === 1
						? null
						: `color-mix(in srgb, currentColor ${textMix * 100}%, var(--color-bg))`}
					>{text}</span
				>
			{/each}
		</div>
	{/each}
</div>

<style>
	.line {
		display: flex;
		align-items: center;
		white-space: pre;
	}
</style>
