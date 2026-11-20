<script lang="ts">
	import type { GroupedSong } from "../../../../data/songBrowser.js";
	import SongTooltip from "../../../../routes/demo/shared/SongTooltip.svelte";
	import HexSongTooltip from "../HexSongTooltip.svelte";
	import SongLabel from "../SongLabel.svelte";
	import type { SongSummary } from "./paint/outlinedLabels.js";
	import TooltipCard from "./TooltipCard.svelte";

	// The hovered song's tooltip: the full (or, when simple, the hex map's
	// simpler) card once the song is loaded, and just its name until then.
	// Every story card shows the song's bar of progressions; basic ones
	// little else.
	let {
		style,
		song,
		summary,
		simple,
		basic = false,
		hint,
		colorForProgression
	}: {
		style: string;
		song: GroupedSong | null;
		summary: SongSummary | null;
		simple: boolean;
		// Only the song's title, year, artist and bar of progressions.
		basic?: boolean;
		// What clicking the song does, for the simple card.
		hint: string;
		colorForProgression: (name: string) => string | undefined;
	} = $props();
</script>

{#if (simple || basic) && song}
	<TooltipCard {style}>
		<HexSongTooltip {song} {colorForProgression} {hint} {basic} />
	</TooltipCard>
{:else if song}
	<TooltipCard {style}>
		<SongTooltip {song} />
	</TooltipCard>
{:else if summary}
	<TooltipCard {style}>
		<SongLabel
			title={summary.title}
			year={summary.year}
			artists={summary.artists}
		/>
		{#if !simple && !basic}
			<div class="meta">loading chords…</div>
		{/if}
	</TooltipCard>
{/if}

<style>
	.meta {
		color: #a1a1aa;
		font-size: 0.65rem;
	}
</style>
